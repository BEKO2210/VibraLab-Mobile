import { useCallback, useMemo, useRef, useState } from 'react'
import FFT from 'fft.js'
import { hann, HANN_COHERENT_GAIN } from '../utils/windowing'
import { findResonance } from '../utils/peakDetector'
import { peakEnvelope, decayTimeConstant, qFromDecay, dampingRatio } from '../utils/damping'
import { consensus, median } from '../utils/stats'

const ACCEL_FFT = 128 // power of two; FFT length over the ringdown window
const WINDOW_MS = 900 // ringdown capture length per run
const POLL_MS = 25 // sampling cadence during arm/capture
const SETTLE_MS = 200 // wait after self-excitation before sampling
const GAP_MS = 350 // pause between runs
const TAP_TIMEOUT_MS = 8000 // per-run wait for a manual tap
const TOL_PCT = 6 // agreement tolerance for the consensus

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Read the last `k` samples from a ring buffer in chronological order. */
function readLast(buf, writeIdx, bufLen, k) {
  const out = new Float64Array(k)
  for (let i = 0; i < k; i++) {
    const idx = (writeIdx - k + i + bufLen * 2) % bufLen
    out[i] = buf[idx]
  }
  return out
}

/** Evenly downsample an array to at most n points (for display). */
function downsample(arr, n) {
  if (arr.length <= n) return Array.from(arr)
  const out = []
  for (let i = 0; i < n; i++) out.push(arr[Math.floor((i / n) * arr.length)])
  return out
}

/** Aggregate per-run estimates into one validated result (median + outlier rejection). */
function aggregate(list) {
  const valid = list.filter((r) => r && r.frequency)
  if (!valid.length) return null
  const c = consensus(
    valid.map((r) => r.frequency),
    TOL_PCT,
  )
  const inliers = c.inlierIndices.map((i) => valid[i])
  const q = median(inliers.map((r) => r.q).filter((x) => x != null))
  const tau = median(inliers.map((r) => r.tau).filter((x) => x != null))
  return {
    frequency: c.value,
    q,
    tau,
    zeta: q != null ? 1 / (2 * q) : null,
    nyquist: valid[0].nyquist,
    agree: c.agree,
    total: valid.length,
    spreadPct: c.spreadPct,
  }
}

/**
 * Phase 8 — "lay the phone on the object" tap/ping test, now self-validating.
 *
 * Runs several excite→capture cycles and reports only the resonance that is
 * consistent across runs (median frequency with outlier rejection), plus an
 * agreement count and spread so a noisy single hit can't masquerade as a result.
 *
 * @param {object} sensor  useSensorData instance (trigger + accel ringdown)
 * @param {object} mic     useMicrophone instance (audible ring)
 */
export function useTapTest(sensor, mic) {
  const [status, setStatus] = useState('idle') // idle | armed | capturing | done
  const [result, setResult] = useState(null)
  const [ringdown, setRingdown] = useState([])
  const [runInfo, setRunInfo] = useState({ current: 0, total: 0 })

  const fft = useMemo(() => new FFT(ACCEL_FFT), [])
  const complexRef = useRef(fft.createComplexArray())
  const runningRef = useRef(false)

  const currentMax = useCallback(() => {
    const k = 6
    const s = readLast(sensor.samplesRef.current, sensor.writeIdxRef.current, sensor.bufLenRef.current, k)
    let m = 0
    for (let i = 0; i < k; i++) m = Math.max(m, Math.abs(s[i]))
    return m
  }, [sensor])

  const analyzeAccel = useCallback(
    (raw, sr) => {
      const input = new Float64Array(ACCEL_FFT)
      const count = Math.min(ACCEL_FFT, raw.length)
      for (let i = 0; i < count; i++) input[i] = raw[i]
      const windowed = hann(input)

      const out = complexRef.current
      fft.realTransform(out, windowed)
      fft.completeSpectrum(out)

      const half = ACCEL_FFT / 2
      const spec = new Float32Array(half)
      const norm = (2 / ACCEL_FFT) / HANN_COHERENT_GAIN
      for (let k = 0; k < half; k++) {
        const re = out[2 * k]
        const im = out[2 * k + 1]
        spec[k] = 20 * Math.log10(Math.sqrt(re * re + im * im) * norm + 1e-9)
      }
      const binHz = sr / ACCEL_FFT
      const det = findResonance(spec, binHz, {
        minBin: Math.max(1, Math.ceil(3 / binHz)),
        maxBin: half - 1,
      })
      if (!det) return null

      const win = Math.max(2, Math.round(sr / Math.max(det.frequency, 1)))
      const { env, stride } = peakEnvelope(raw, win)
      const tau = decayTimeConstant(env, stride / sr)
      const q = qFromDecay(det.frequency, tau)
      return { frequency: det.frequency, level: det.level, tau, q, zeta: dampingRatio(q), nyquist: sr / 2 }
    },
    [fft],
  )

  const analyzeMic = useCallback((samples) => {
    if (!samples.length) return null
    let loud = samples[0]
    for (const s of samples) if (s.level > loud.level) loud = s
    const frequency = loud.freq
    const amps = samples.map((s) => Math.pow(10, s.level / 20))
    let dt = 0
    if (samples.length > 1) dt = (samples[samples.length - 1].t - samples[0].t) / (samples.length - 1)
    const tau = dt > 0 ? decayTimeConstant(amps, dt) : null
    const q = qFromDecay(frequency, tau)
    return { frequency, level: loud.level, tau, q, zeta: dampingRatio(q) }
  }, [])

  /** Capture one ringdown window: samples the mic and reads the accel buffer. */
  const captureRingdown = useCallback(
    async (useMicFlag) => {
      const micSamples = []
      const t0 = performance.now()
      while (runningRef.current && performance.now() - t0 < WINDOW_MS) {
        if (useMicFlag && mic.status === 'running') {
          const r = mic.getSpectrum()
          if (r) {
            const det = findResonance(r.spectrumDb, r.binHz, {
              minBin: Math.ceil(60 / r.binHz),
              maxBin: Math.min(r.spectrumDb.length - 1, Math.ceil(8000 / r.binHz)),
              floorDb: -90,
            })
            if (det) micSamples.push({ t: (performance.now() - t0) / 1000, freq: det.frequency, level: det.level })
          }
        }
        await sleep(POLL_MS)
      }
      const sr = sensor.sampleRateRef.current
      const winCount = Math.min(
        sensor.bufLenRef.current,
        Math.max(ACCEL_FFT, Math.round((WINDOW_MS / 1000) * sr)),
      )
      const raw = readLast(sensor.samplesRef.current, sensor.writeIdxRef.current, sensor.bufLenRef.current, winCount)
      return {
        accel: analyzeAccel(raw, sr),
        mic: useMicFlag ? analyzeMic(micSamples) : null,
        raw,
      }
    },
    [sensor, mic, analyzeAccel, analyzeMic],
  )

  /** Wait for a manual tap (transient above an auto-calibrated baseline). */
  const waitForTap = useCallback(async () => {
    let base = 0
    const bEnd = performance.now() + 350
    while (runningRef.current && performance.now() < bEnd) {
      base = Math.max(base, currentMax())
      await sleep(POLL_MS)
    }
    const threshold = Math.max(base * 5, 0.2)
    const tEnd = performance.now() + TAP_TIMEOUT_MS
    while (runningRef.current && performance.now() < tEnd) {
      if (currentMax() > threshold) return true
      await sleep(POLL_MS)
    }
    return false
  }, [currentMax])

  const arm = useCallback(
    async ({ selfExcite = false, useMic = true, runs = 5, excite } = {}) => {
      if (sensor.status !== 'running') return
      runningRef.current = true
      setResult(null)
      setRingdown([])
      setStatus('armed')

      const accelRuns = []
      const micRuns = []
      let lastRaw = null

      for (let r = 0; r < runs; r++) {
        if (!runningRef.current) break
        setRunInfo({ current: r + 1, total: runs })

        if (selfExcite) {
          excite?.() // fire ping/buzz for this run (audio is already unlocked)
          setStatus('capturing')
          await sleep(SETTLE_MS)
        } else {
          setStatus('armed')
          const tapped = await waitForTap()
          if (!tapped) break // user stopped tapping
          setStatus('capturing')
        }
        if (!runningRef.current) break

        const cap = await captureRingdown(useMic)
        if (cap.accel) accelRuns.push(cap.accel)
        if (cap.mic) micRuns.push(cap.mic)
        if (cap.raw) {
          lastRaw = cap.raw
          setRingdown(downsample(cap.raw, 200))
        }

        if (r < runs - 1) await sleep(GAP_MS)
      }

      if (!runningRef.current && accelRuns.length === 0 && micRuns.length === 0) return

      setResult({ accel: aggregate(accelRuns), mic: aggregate(micRuns), runs })
      setStatus('done')
      setRunInfo({ current: 0, total: 0 })
      runningRef.current = false
      void lastRaw
    },
    [sensor, captureRingdown, waitForTap],
  )

  const cancel = useCallback(() => {
    runningRef.current = false
    setStatus('idle')
    setRunInfo({ current: 0, total: 0 })
  }, [])

  const reset = useCallback(() => {
    runningRef.current = false
    setResult(null)
    setRingdown([])
    setRunInfo({ current: 0, total: 0 })
    setStatus('idle')
  }, [])

  return { status, result, ringdown, runInfo, arm, cancel, reset }
}
