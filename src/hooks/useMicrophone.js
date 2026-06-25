import { useCallback, useEffect, useRef, useState } from 'react'

const FFT_SIZE = 4096 // ~10.7 Hz bins at 44.1 kHz; good freq resolution

/**
 * Microphone capture + Web Audio AnalyserNode.
 *
 * The AnalyserNode performs the FFT for us natively. getFloatFrequencyData
 * returns per-bin levels in dBFS, covering the full audible range up to the
 * Nyquist frequency (sampleRate / 2, typically ~22 kHz).
 *
 * status: 'idle' | 'requesting' | 'running' | 'denied' | 'unsupported'
 */
export function useMicrophone() {
  const [status, setStatus] = useState('idle')
  const ctxRef = useRef(null)
  const analyserRef = useRef(null)
  const streamRef = useRef(null)
  const dataRef = useRef(null)
  const binHzRef = useRef(0)

  const isSupported =
    typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

  const start = useCallback(async () => {
    if (!isSupported) {
      setStatus('unsupported')
      return
    }
    setStatus('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // Disable processing that would distort the spectrum.
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })
      streamRef.current = stream

      const AudioCtx = window.AudioContext || window.webkitAudioContext
      const ctx = new AudioCtx()
      ctxRef.current = ctx
      if (ctx.state === 'suspended') await ctx.resume()

      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = FFT_SIZE
      analyser.smoothingTimeConstant = 0.5
      source.connect(analyser)
      analyserRef.current = analyser

      dataRef.current = new Float32Array(analyser.frequencyBinCount)
      binHzRef.current = ctx.sampleRate / analyser.fftSize

      setStatus('running')
    } catch (err) {
      setStatus(err?.name === 'NotAllowedError' ? 'denied' : 'unsupported')
    }
  }, [isSupported])

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    ctxRef.current?.close()
    streamRef.current = null
    ctxRef.current = null
    analyserRef.current = null
    setStatus('idle')
  }, [])

  /** Fill and return the latest dB spectrum (or null if not running). */
  const getSpectrum = useCallback(() => {
    const analyser = analyserRef.current
    const data = dataRef.current
    if (!analyser || !data) return null
    analyser.getFloatFrequencyData(data)
    return { spectrumDb: data, binHz: binHzRef.current }
  }, [])

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      ctxRef.current?.close()
    }
  }, [])

  return { status, start, stop, getSpectrum, isSupported }
}
