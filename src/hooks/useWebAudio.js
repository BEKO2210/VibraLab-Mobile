import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Tone generator built on the Web Audio API.
 *
 * The AudioContext is created lazily on the first play() call, because browser
 * autoplay policy requires it to be resumed from a user gesture. A single
 * OscillatorNode -> GainNode -> destination graph is (re)built per playback.
 *
 * Returns live setters so frequency/amplitude/waveform can be changed smoothly
 * while a tone is playing.
 */
export function useWebAudio() {
  const ctxRef = useRef(null)
  const oscRef = useRef(null)
  const gainRef = useRef(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [frequency, setFrequencyState] = useState(440)
  const [amplitude, setAmplitudeState] = useState(0.5) // 0..1
  const [waveform, setWaveformState] = useState('sine')

  // Keep refs in sync so play() always reads the latest values.
  const freqRef = useRef(frequency)
  const ampRef = useRef(amplitude)
  const waveRef = useRef(waveform)
  freqRef.current = frequency
  ampRef.current = amplitude
  waveRef.current = waveform

  const ensureContext = useCallback(() => {
    if (!ctxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      ctxRef.current = new AudioCtx()
    }
    return ctxRef.current
  }, [])

  const stop = useCallback(() => {
    const gain = gainRef.current
    const osc = oscRef.current
    const ctx = ctxRef.current
    if (gain && ctx) {
      // Short ramp to avoid an audible click on stop.
      const now = ctx.currentTime
      gain.gain.cancelScheduledValues(now)
      gain.gain.setValueAtTime(gain.gain.value, now)
      gain.gain.linearRampToValueAtTime(0, now + 0.02)
    }
    if (osc) {
      try {
        osc.stop(ctx ? ctx.currentTime + 0.03 : 0)
      } catch {
        /* already stopped */
      }
      oscRef.current = null
      gainRef.current = null
    }
    setIsPlaying(false)
  }, [])

  const play = useCallback(async () => {
    const ctx = ensureContext()
    if (ctx.state === 'suspended') await ctx.resume()

    // Rebuild the graph for a fresh oscillator (oscillators are single-use).
    if (oscRef.current) {
      try {
        oscRef.current.stop()
      } catch {
        /* noop */
      }
    }
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = waveRef.current
    osc.frequency.setValueAtTime(freqRef.current, ctx.currentTime)
    gain.gain.setValueAtTime(0, ctx.currentTime)
    // Ramp up to target amplitude to avoid a click on start.
    gain.gain.linearRampToValueAtTime(ampRef.current, ctx.currentTime + 0.02)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    oscRef.current = osc
    gainRef.current = gain
    setIsPlaying(true)
  }, [ensureContext])

  const setFrequency = useCallback((hz) => {
    setFrequencyState(hz)
    const ctx = ctxRef.current
    if (oscRef.current && ctx) {
      // Glide to the new frequency to keep a sweep smooth.
      oscRef.current.frequency.linearRampToValueAtTime(hz, ctx.currentTime + 0.03)
    }
  }, [])

  const setAmplitude = useCallback((amp) => {
    setAmplitudeState(amp)
    const ctx = ctxRef.current
    if (gainRef.current && ctx) {
      gainRef.current.gain.linearRampToValueAtTime(amp, ctx.currentTime + 0.03)
    }
  }, [])

  const setWaveform = useCallback((type) => {
    setWaveformState(type)
    if (oscRef.current) oscRef.current.type = type
  }, [])

  // Tear down the audio context when the hook unmounts.
  useEffect(() => {
    return () => {
      try {
        oscRef.current?.stop()
      } catch {
        /* noop */
      }
      ctxRef.current?.close()
    }
  }, [])

  return {
    isPlaying,
    frequency,
    amplitude,
    waveform,
    play,
    stop,
    setFrequency,
    setAmplitude,
    setWaveform,
    /** Expose the shared AudioContext so the analyzer can reuse it if needed. */
    getContext: () => ctxRef.current,
  }
}
