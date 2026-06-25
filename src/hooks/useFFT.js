import { useCallback, useMemo, useRef } from 'react'
import FFT from 'fft.js'
import { hann, HANN_COHERENT_GAIN } from '../utils/windowing'

const FFT_SIZE = 256 // power of two; ~4 s window at ~60 Hz event rate

/**
 * FFT on the accelerometer magnitude buffer (the low-frequency path).
 *
 * Reads the most recent FFT_SIZE samples (chronological order) from the ring
 * buffer owned by useSensorData, applies a Hann window, runs a radix-2 FFT and
 * returns a dB magnitude spectrum together with the bin spacing in Hz derived
 * from the *measured* event rate.
 *
 * @param {object} sensor  the object returned by useSensorData
 */
export function useFFT(sensor) {
  const { samplesRef, writeIdxRef, sampleRateRef, bufLenRef } = sensor

  const fft = useMemo(() => new FFT(FFT_SIZE), [])
  const complexRef = useRef(fft.createComplexArray())
  const windowInputRef = useRef(new Float64Array(FFT_SIZE))
  const spectrumRef = useRef(new Float32Array(FFT_SIZE / 2))

  const getSpectrum = useCallback(() => {
    const buf = samplesRef.current
    const bufLen = bufLenRef.current
    const writeIdx = writeIdxRef.current

    // Copy the most recent FFT_SIZE samples in chronological order.
    const input = windowInputRef.current
    for (let i = 0; i < FFT_SIZE; i++) {
      // oldest of the window first
      const idx = (writeIdx - FFT_SIZE + i + bufLen * 2) % bufLen
      input[i] = buf[idx]
    }

    // Hann window to limit spectral leakage.
    const windowed = hann(input)

    // Real FFT → interleaved complex output.
    const out = complexRef.current
    fft.realTransform(out, windowed)
    fft.completeSpectrum(out)

    const spectrum = spectrumRef.current
    const N = FFT_SIZE
    // Amplitude normalisation: /N, *2 (single-sided), / coherent gain (window).
    const norm = (2 / N) / HANN_COHERENT_GAIN
    for (let k = 0; k < N / 2; k++) {
      const re = out[2 * k]
      const im = out[2 * k + 1]
      const mag = Math.sqrt(re * re + im * im) * norm
      // Convert to dB; floor very small values to avoid -Infinity.
      spectrum[k] = 20 * Math.log10(mag + 1e-9)
    }

    const binHz = sampleRateRef.current / N
    return { spectrumDb: spectrum, binHz }
  }, [fft, samplesRef, writeIdxRef, sampleRateRef, bufLenRef])

  return { getSpectrum, fftSize: FFT_SIZE }
}
