// Number formatting helpers for the readouts (monospace numeric display).

/** Format a frequency in Hz with adaptive precision. */
export function formatHz(hz) {
  if (hz == null || Number.isNaN(hz)) return '—'
  if (hz >= 1000) return `${(hz / 1000).toFixed(2)} kHz`
  if (hz >= 100) return `${hz.toFixed(1)} Hz`
  return `${hz.toFixed(2)} Hz`
}

/** Format a decibel value. */
export function formatDb(db) {
  if (db == null || !Number.isFinite(db)) return '—'
  return `${db.toFixed(1)} dB`
}

/** Format the quality (Q) factor. */
export function formatQ(q) {
  if (q == null || !Number.isFinite(q)) return '—'
  return q.toFixed(1)
}

/** Clamp a value into [min, max]. */
export function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}
