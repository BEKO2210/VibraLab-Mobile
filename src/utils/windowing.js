// Window functions applied before an FFT to reduce spectral leakage.

/**
 * Apply a Hann window in-place-safe: returns a new array of windowed samples.
 * w[n] = 0.5 * (1 - cos(2*pi*n / (N-1)))
 */
export function hann(samples) {
  const N = samples.length
  const out = new Float64Array(N)
  if (N <= 1) {
    out.set(samples)
    return out
  }
  for (let n = 0; n < N; n++) {
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * n) / (N - 1)))
    out[n] = samples[n] * w
  }
  return out
}

/**
 * Coherent gain of the Hann window (mean of the window), used to compensate
 * amplitude after windowing. For a Hann window this is 0.5.
 */
export const HANN_COHERENT_GAIN = 0.5
