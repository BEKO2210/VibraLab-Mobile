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

/**
 * Find the resonance from a measured swept-sine response curve.
 *
 * @param {{f:number, amp:number}[]} points  measured points, ascending in f.
 *        `amp` is the response level in dB at frequency `f`.
 * @returns {null | {frequency:number, level:number, q:number|null}}
 */
export function resonanceFromCurve(points) {
  if (!points || points.length < 3) {
    if (points && points.length) {
      const p = points.reduce((a, b) => (b.amp > a.amp ? b : a))
      return { frequency: p.f, level: p.amp, q: null }
    }
    return null
  }

  // Peak point of the response.
  let pk = 0
  for (let i = 1; i < points.length; i++) if (points[i].amp > points[pk].amp) pk = i
  const fPeak = points[pk].f
  const peakDb = points[pk].amp
  const target = peakDb - 3

  // Walk outward to the -3 dB half-power points, interpolating the crossing f.
  const left = crossFreq(points, pk, -1, target)
  const right = crossFreq(points, pk, +1, target)

  let q = null
  if (left != null && right != null && right > left) {
    q = fPeak / (right - left)
  }
  return { frequency: fPeak, level: peakDb, q }
}

/** Walk from the peak in `dir` until amp drops below `target`; interpolate f. */
function crossFreq(points, pk, dir, target) {
  let i = pk
  while (i + dir >= 0 && i + dir < points.length && points[i + dir].amp > target) {
    i += dir
  }
  const j = i + dir
  if (j < 0 || j >= points.length) return null // never crossed within range
  const a = points[i]
  const b = points[j]
  if (a.amp === b.amp) return a.f
  const t = (target - a.amp) / (b.amp - a.amp)
  return a.f + t * (b.f - a.f)
}
