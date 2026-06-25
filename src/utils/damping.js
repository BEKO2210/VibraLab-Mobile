// Damping / ringdown analysis for the tap test.
//
// When a structure is struck it vibrates at its natural frequency and the
// amplitude decays exponentially: A(t) = A0 * exp(-t / tau). The decay time
// constant tau relates to the quality factor by Q = pi * f * tau, and to the
// damping ratio by zeta = 1 / (2 * Q).

/**
 * Extract a peak envelope from an oscillating signal by taking the maximum of
 * |signal| over consecutive blocks of `win` samples. This removes the
 * zero-crossing dips so the decay can be fit cleanly. Returns the envelope and
 * the effective time step between envelope samples (win * dt).
 *
 * @param {number[]|Float64Array} signal
 * @param {number} win    block size in samples (≈ one oscillation period)
 * @returns {{ env:number[], stride:number }}
 */
export function peakEnvelope(signal, win) {
  const w = Math.max(1, Math.floor(win))
  const env = []
  for (let i = 0; i < signal.length; i += w) {
    let m = 0
    for (let j = i; j < Math.min(i + w, signal.length); j++) {
      const a = Math.abs(signal[j])
      if (a > m) m = a
    }
    env.push(m)
  }
  return { env, stride: w }
}

/**
 * Estimate the exponential decay time constant tau (seconds) from an amplitude
 * envelope by a least-squares fit of ln(envelope) vs time over the decaying
 * tail (from the global peak down to a noise floor).
 *
 * @param {number[]|Float64Array} envelope  non-negative amplitude samples
 * @param {number} dt   seconds between samples
 * @returns {number|null} tau in seconds, or null if it cannot be estimated
 */
export function decayTimeConstant(envelope, dt) {
  const n = envelope.length
  if (n < 4 || !(dt > 0)) return null

  // Start at the global peak.
  let peakIdx = 0
  let peak = -Infinity
  for (let i = 0; i < n; i++) {
    if (envelope[i] > peak) {
      peak = envelope[i]
      peakIdx = i
    }
  }
  if (peak <= 0) return null

  // Fit over the decay from the peak until the envelope falls below 5% of peak.
  const floor = peak * 0.05
  const xs = []
  const ys = []
  for (let i = peakIdx; i < n; i++) {
    const v = envelope[i]
    if (v <= floor) break
    xs.push((i - peakIdx) * dt)
    ys.push(Math.log(v))
  }
  if (xs.length < 3) return null

  // Linear regression ys = a + b*xs ; tau = -1/b.
  const m = xs.length
  let sx = 0
  let sy = 0
  let sxx = 0
  let sxy = 0
  for (let i = 0; i < m; i++) {
    sx += xs[i]
    sy += ys[i]
    sxx += xs[i] * xs[i]
    sxy += xs[i] * ys[i]
  }
  const denom = m * sxx - sx * sx
  if (denom === 0) return null
  const b = (m * sxy - sx * sy) / denom
  if (b >= 0) return null // not decaying
  return -1 / b
}

/** Quality factor from natural frequency and decay time constant. */
export function qFromDecay(freqHz, tau) {
  if (!(freqHz > 0) || !(tau > 0)) return null
  return Math.PI * freqHz * tau
}

/** Damping ratio zeta from Q. */
export function dampingRatio(q) {
  if (!(q > 0)) return null
  return 1 / (2 * q)
}
