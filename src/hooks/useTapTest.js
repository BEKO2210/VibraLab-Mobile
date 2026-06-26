import { useCallback, useMemo, useRef, useState } from 'react'
import FFT from 'fft.js'
import { hann, HANN_COHERENT_GAIN } from '../utils/windowing'
import { findResonance } from '../utils/peakDetector'
import { peakEnvelope, decayTimeConstant, qFromDecay, dampingRatio } from '../utils/damping'

const ACCEL_FFT = 128 // power of two; FFT length over the ringdown window
const WINDOW_MS = 1500 // ringdown capture length
const POLL_MS = 25 // sampling cadence during arm/capture
const ARM_TIMEOUT_MS = 15000 // give up waiting for a tap after this

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

/**
 * Phase 8 — "lay the phone on the object" tap/ping test.
 *
 * Workflow: arm → (optional vibration self-excite, or wait for a tap that the
 * accelerometer detects as a transient) → capture the ringdown → analyse it.
 * The accelerometer gives the structural (low-frequency, ≤ Nyquist) resonance
 * and its damping; the microphone gives the audible ring frequency and decay.
 *
 * @param {object} sensor  useSensorData instance (trigger + accel ringdown)
 * @param {object} mic     useMicrophone instance (audible ring)
 */
export function useTapTest(sensor, mic) {
  const [status, setStatus] = useState('idle') // idle | armed | capturing | done
  const [result, setResult] = useState(null)
  const [ringdown, setRingdown] = useState([]) // accel AC window for display

  const fft = useMemo(() => new FFT(ACCEL_FFT), [])
  const complexRef = useRef(fft.createComplexArray())
  const runningRef = useRef(false)
  const micSamplesRef = useRef([])

  const currentMax = useCallback(() => {
    const k = 6
    const s = readLast(sensor.samplesRef.current, sensor.writeIdxRef.current, sensor.bufLenRef.current, k)
    let m = 0
    for (let i = 0; i < k; i++) m = Math.max(m, Math.abs(s[i]))
    return m
  }, [sensor])

  const analyzeAccel = useCallback(
    (raw, sr) => {
      // Window the start of the ringdown (right after impact) for the FFT.
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

      // Damping from the ringdown envelope (≈ one cycle per envelope block).
      const win = Math.max(2, Math.round(sr / Math.max(det.frequency, 1)))
      const { env, stride } = peakEnvelope(raw, win)
      const tau = decayTimeConstant(env, stride / sr)
      const q = qFromDecay(det.frequency, tau)
      return {
        frequency: det.frequency,
        level: det.level,
        tau,
        q,
        zeta: dampingRatio(q),
        nyquist: sr / 2,
      }
    },
    [fft],
  )

  const analyzeMic = useCallback((samples) => {
    if (!samples.length) return null
    // Dominant frequency = frequency at the loudest captured moment (the ring).
    let loud = samples[0]
    for (const s of samples) if (s.level > loud.level) loud = s
    const frequency = loud.freq

    // Decay from the level envelope (dB → linear amplitude).
    const amps = samples.map((s) => Math.pow(10, s.level / 20))
    let dt = 0
    if (samples.length > 1) {
      dt = (samples[samples.length - 1].t - samples[0].t) / (samples.length - 1)
    }
    const tau = dt > 0 ? decayTimeConstant(amps, dt) : null
    const q = qFromDecay(frequency, tau)
    return { frequency, level: loud.level, tau, q, zeta: dampingRatio(q) }
  }, [])

  const arm = useCallback(
    async ({ selfExcite = false, useMic = true } = {}) => {
      if (sensor.status !== 'running') return
      runningRef.current = true
      micSamplesRef.current = []
      setResult(null)
      setRingdown([])
      setStatus('armed')

      // --- Excite / wait for the impact -------------------------------------
      // For self-excite the caller fires navigator.vibrate() synchronously
      // inside the click handler (so the browser's user-activation isn't lost);
      // here we just wait for the buzz to finish — its tail rings the object.
      let impact = false
      if (selfExcite) {
        await sleep(220)
        impact = runningRef.current
      } else {
        // Establish a noise baseline, then watch for a transient above it.
        let base = 0
        const bEnd = performance.now() + 400
        while (runningRef.current && performance.now() < bEnd) {
          base = Math.max(base, currentMax())
          await sleep(POLL_MS)
        }
        const threshold = Math.max(base * 5, 0.2)
        const tEnd = performance.now() + ARM_TIMEOUT_MS
        while (runningRef.current && performance.now() < tEnd) {
          if (currentMax() > threshold) {
            impact = true
            break
          }
          await sleep(POLL_MS)
        }
      }
      if (!runningRef.current) return
      if (!impact) {
        runningRef.current = false
        setStatus('idle')
        return
      }

      // --- Capture the ringdown ---------------------------------------------
      setStatus('capturing')
      const t0 = performance.now()
      while (runningRef.current && performance.now() - t0 < WINDOW_MS) {
        if (useMic && mic.status === 'running') {
          const r = mic.getSpectrum()
          if (r) {
            const det = findResonance(r.spectrumDb, r.binHz, {
              minBin: Math.ceil(60 / r.binHz),
              maxBin: Math.min(r.spectrumDb.length - 1, Math.ceil(8000 / r.binHz)),
              floorDb: -90,
            })
            if (det) {
              micSamplesRef.current.push({
                t: (performance.now() - t0) / 1000,
                freq: det.frequency,
                level: det.level,
              })
            }
          }
        }
        await sleep(POLL_MS)
      }
      if (!runningRef.current) return

      // --- Analyse -----------------------------------------------------------
      const sr = sensor.sampleRateRef.current
      const winCount = Math.min(
        sensor.bufLenRef.current,
        Math.max(ACCEL_FFT, Math.round((WINDOW_MS / 1000) * sr)),
      )
      const raw = readLast(
        sensor.samplesRef.current,
        sensor.writeIdxRef.current,
        sensor.bufLenRef.current,
        winCount,
      )
      setRingdown(downsample(raw, 200))

      setResult({
        accel: analyzeAccel(raw, sr),
        mic: useMic ? analyzeMic(micSamplesRef.current) : null,
      })
      setStatus('done')
      runningRef.current = false
    },
    [sensor, mic, currentMax, analyzeAccel, analyzeMic],
  )

  const cancel = useCallback(() => {
    runningRef.current = false
    setStatus('idle')
  }, [])

  const reset = useCallback(() => {
    runningRef.current = false
    setResult(null)
    setRingdown([])
    setStatus('idle')
  }, [])

  return { status, result, ringdown, arm, cancel, reset }
}
