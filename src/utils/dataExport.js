// CSV export of a swept-sine measurement.

/** Trigger a client-side file download of `text`. */
function download(text, filename, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke on the next tick so the download has a chance to start.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** A filesystem-safe timestamp like 2026-06-25_14-07-33. */
function timestamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(
    d.getMinutes(),
  )}-${p(d.getSeconds())}`
}

/**
 * Export a sweep as CSV.
 * @param {{f:number, amp:number}[]} points
 * @param {object} meta  { source, startHz, endHz, speed, result }
 */
export function exportSweepCsv(points, meta = {}) {
  const { source, startHz, endHz, speed, result } = meta
  const lines = []
  lines.push('# VibraLab-Mobile / ResoScope — Sweep-Messung')
  lines.push(`# quelle,${source ?? ''}`)
  lines.push(`# start_hz,${startHz ?? ''}`)
  lines.push(`# ende_hz,${endHz ?? ''}`)
  lines.push(`# speed_hz_pro_s,${speed ?? ''}`)
  if (result) {
    lines.push(`# resonanz_hz,${result.frequency?.toFixed(2) ?? ''}`)
    lines.push(`# q_faktor,${result.q != null ? result.q.toFixed(2) : ''}`)
    lines.push(`# pegel_db,${result.level?.toFixed(2) ?? ''}`)
  }
  lines.push('frequency_hz,amplitude_db')
  for (const p of points) lines.push(`${p.f.toFixed(2)},${p.amp.toFixed(2)}`)

  download(lines.join('\n'), `vibralab-sweep_${timestamp()}.csv`, 'text/csv')
}
