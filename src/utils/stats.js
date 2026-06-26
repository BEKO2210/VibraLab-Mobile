// Small statistics helpers for aggregating repeated measurements.

/** Median of a numeric array (returns null for empty input). */
export function median(values) {
  if (!values.length) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/** Arithmetic mean (returns null for empty input). */
export function mean(values) {
  if (!values.length) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

/** Population standard deviation (returns 0 for <2 samples). */
export function std(values) {
  if (values.length < 2) return 0
  const m = mean(values)
  const v = values.reduce((a, b) => a + (b - m) * (b - m), 0) / values.length
  return Math.sqrt(v)
}

/**
 * Robust consensus over repeated frequency estimates: take the median, keep
 * only samples within `tolPct` percent of it (reject outliers), and report the
 * agreed value plus how many runs agreed and their spread.
 *
 * @param {number[]} values
 * @param {number} tolPct  agreement tolerance in percent (default 5)
 * @returns {null | {value:number, inlierIndices:number[], agree:number, total:number, spreadPct:number}}
 */
export function consensus(values, tolPct = 5) {
  if (!values.length) return null
  const med = median(values)
  const tol = (Math.abs(med) * tolPct) / 100
  const inlierIndices = []
  const inliers = []
  values.forEach((v, i) => {
    if (Math.abs(v - med) <= tol) {
      inlierIndices.push(i)
      inliers.push(v)
    }
  })
  const value = median(inliers)
  const spreadPct = value ? (std(inliers) / value) * 100 : 0
  return { value, inlierIndices, agree: inliers.length, total: values.length, spreadPct }
}
