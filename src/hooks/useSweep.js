import { useCallback, useRef, useState } from 'react'
import { resonanceFromCurve } from '../utils/peakDetector'

const TICK_MS = 60 // measurement cadence
const SETTLE_TICKS = 1 // ticks to wait after a frequency change before sampling

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Phase 4 — automated swept-sine measurement.
 *
 * Drives the generator from startHz to endHz at a given speed (Hz/s), sampling
 * the response amplitude from the shared analyzer at each step to build a
 * frequency-response curve. The peak of that curve is the resonance.
 *
 * @param {object} audio     useWebAudio instance (the excitation source)
 * @param {object} analyzer  useAnalyzer instance (the measurement source)
 */
export function useSweep(audio, analyzer) {
  const [status, setStatus] = useState('idle') // 'idle' | 'running' | 'done'
  const [progress, setProgress] = useState(0) // 0..1
  const [points, setPoints] = useState([]) // {f, amp}[]
  const [result, setResult] = useState(null) // {frequency, q, level}

  const cancelRef = useRef(false)
  const pointsRef = useRef([])

  const run = useCallback(
    async ({ startHz, endHz, speed }) => {
      if (analyzer.status !== 'running') return // measurement source must be live

      cancelRef.current = false
      pointsRef.current = []
      setPoints([])
      setResult(null)
      setProgress(0)
      setStatus('running')

      // The Start button click is the user gesture that unlocks audio.
      await audio.play()

      const span = Math.max(1, endHz - startHz)
      const totalMs = Math.max(500, (span / speed) * 1000)
      const ticks = Math.ceil(totalMs / TICK_MS)

      for (let i = 0; i <= ticks; i++) {
        if (cancelRef.current) break
        const t = i / ticks
        const f = startHz + span * t
        audio.setFrequency(f)
        // Let the tone settle / the analyser smoothing catch up before sampling.
        await sleep(TICK_MS * (SETTLE_TICKS + 1))
        if (cancelRef.current) break

        const amp = analyzer.getMagnitudeAt(f)
        if (amp != null && Number.isFinite(amp)) {
          pointsRef.current.push({ f, amp })
          setPoints(pointsRef.current.slice())
        }
        setProgress(t)
      }

      audio.stop()
      const res = resonanceFromCurve(pointsRef.current)
      setResult(res)
      setStatus(cancelRef.current ? 'idle' : 'done')
      setProgress(cancelRef.current ? 0 : 1)
    },
    [audio, analyzer],
  )

  const cancel = useCallback(() => {
    cancelRef.current = true
    audio.stop()
  }, [audio])

  const reset = useCallback(() => {
    cancelRef.current = true
    audio.stop()
    pointsRef.current = []
    setPoints([])
    setResult(null)
    setProgress(0)
    setStatus('idle')
  }, [audio])

  return { status, progress, points, result, run, cancel, reset }
}
