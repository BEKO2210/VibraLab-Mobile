// Peak detection on a magnitude/dB spectrum: finds the dominant frequency
// (resonance) and estimates its quality factor from the -3 dB bandwidth.

/**
 * Find the dominant peak in a spectrum.
 *
 * @param {Float32Array|Float64Array|number[]} spectrumDb  per-bin level in dB
 * @param {number} binHz   frequency spacing between bins (sampleRate / fftSize)
 * @param {object} [opts]
 * @param {number} [opts.minBin=1]      ignore bins below this index (DC / very low)
 * @param {number} [opts.maxBin]        ignore bins above this index
 * @param {number} [opts.floorDb=-Infinity]  ignore peaks weaker than this
 * @returns {null | {frequency:number, level:number, q:number|null, binIndex:number}}
 */
export function findResonance(spectrumDb, binHz, opts = {}) {
  const { minBin = 1, maxBin = spectrumDb.length - 1, floorDb = -Infinity } = opts

  let peakIndex = -1
  let peakDb = -Infinity
  for (let i = minBin; i <= maxBin; i++) {
    const v = spectrumDb[i]
    if (v > peakDb) {
      peakDb = v
      peakIndex = i
    }
  }
  if (peakIndex < 0 || peakDb < floorDb) return null

  // Parabolic interpolation around the peak for sub-bin frequency accuracy.
  const frequency = interpolatedPeakFreq(spectrumDb, peakIndex, binHz)

  return {
    frequency,
    level: peakDb,
    q: estimateQ(spectrumDb, peakIndex, peakDb, binHz),
    binIndex: peakIndex,
  }
}

/** Parabolic (quadratic) interpolation of the true peak frequency. */
function interpolatedPeakFreq(spectrum, i, binHz) {
  if (i <= 0 || i >= spectrum.length - 1) return i * binHz
  const a = spectrum[i - 1]
  const b = spectrum[i]
  const c = spectrum[i + 1]
  const denom = a - 2 * b + c
  // delta in [-0.5, 0.5] relative to the peak bin
  const delta = denom !== 0 ? (0.5 * (a - c)) / denom : 0
  return (i + delta) * binHz
}

/**
 * Estimate the quality factor Q = f_peak / bandwidth, where bandwidth is the
 * width of the peak at -3 dB below its maximum (half-power points).
 * Returns null if the -3 dB points cannot be located within the spectrum.
 */
function estimateQ(spectrum, peakIndex, peakDb, binHz) {
  const target = peakDb - 3

  // Walk left until we drop below the -3 dB level.
  let left = peakIndex
  while (left > 0 && spectrum[left] > target) left--
  if (spectrum[left] > target) return null // never crossed on the left

  // Walk right until we drop below the -3 dB level.
  let right = peakIndex
  while (right < spectrum.length - 1 && spectrum[right] > target) right++
  if (spectrum[right] > target) return null // never crossed on the right

  // Linear interpolation of the exact crossing bin on each side.
  const leftCross = crossBin(spectrum, left, left + 1, target)
  const rightCross = crossBin(spectrum, right - 1, right, target)

  const bandwidthHz = (rightCross - leftCross) * binHz
  const fPeak = peakIndex * binHz
  if (bandwidthHz <= 0) return null
  return fPeak / bandwidthHz
}

/** Linearly interpolate the fractional bin where the level crosses `target`. */
function crossBin(spectrum, i0, i1, target) {
  const v0 = spectrum[i0]
  const v1 = spectrum[i1]
  if (v0 === v1) return i0
  const t = (target - v0) / (v1 - v0)
  return i0 + t
}
