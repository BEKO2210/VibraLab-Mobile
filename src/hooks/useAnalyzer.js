import { useCallback, useState } from 'react'
import { useMicrophone } from './useMicrophone'
import { useFFT } from './useFFT'

/**
 * Shared analysis-source manager used by both the Analyzer and the Sweep tabs.
 *
 * Bundles the two input sources (microphone + accelerometer-FFT), the source
 * selection, and a uniform spectrum/magnitude interface so the live spectrum
 * view and the swept-sine measurement read from the exact same pipeline.
 *
 * @param {object} sensor  object returned by useSensorData
 */
export function useAnalyzer(sensor) {
  const [source, setSource] = useState('mic')
  const mic = useMicrophone()
  const accelFFT = useFFT(sensor)

  const isMic = source === 'mic'
  const status = isMic ? mic.status : sensor.status
  const start = isMic ? mic.start : sensor.start

  const sampleRate = sensor.sampleRateRef.current
  const nyquist = Math.floor(sampleRate / 2)
  const maxHz = isMic ? 2000 : Math.max(10, nyquist)

  /** Latest dB spectrum from the active source, or null. */
  const getSpectrum = useCallback(
    () => (isMic ? mic.getSpectrum() : accelFFT.getSpectrum()),
    [isMic, mic, accelFFT],
  )

  /**
   * dB magnitude of the active spectrum at (or next to) a given frequency.
   * Takes the max over a ±1 bin neighborhood to be robust against bin rounding
   * and spectral leakage. Returns null when no spectrum is available.
   */
  const getMagnitudeAt = useCallback(
    (freq) => {
      const r = getSpectrum()
      if (!r) return null
      const { spectrumDb, binHz } = r
      const bin = Math.round(freq / binHz)
      if (bin < 0 || bin >= spectrumDb.length) return null
      let m = -Infinity
      const lo = Math.max(0, bin - 1)
      const hi = Math.min(spectrumDb.length - 1, bin + 1)
      for (let b = lo; b <= hi; b++) m = Math.max(m, spectrumDb[b])
      return m
    },
    [getSpectrum],
  )

  return {
    source,
    setSource,
    isMic,
    status,
    start,
    sampleRate,
    nyquist,
    maxHz,
    getSpectrum,
    getMagnitudeAt,
  }
}
