import { useEffect, useRef } from 'react'

/**
 * Static frequency-response curve: amplitude (dB) over frequency (Hz).
 * Redraws whenever the measured points change (~16x/s during a sweep).
 * Marks the detected resonance frequency.
 */
export default function ResponseChart({ points, startHz, endHz, peak, height = 240 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    canvas.width = Math.max(1, Math.floor(w * dpr))
    canvas.height = Math.max(1, Math.floor(height * dpr))
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const h = height

    ctx.clearRect(0, 0, w, h)

    // Vertical dB grid
    ctx.strokeStyle = '#1e2632'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let i = 1; i < 4; i++) {
      const y = (h / 4) * i
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
    }
    ctx.stroke()

    const fSpan = Math.max(1, endHz - startHz)
    const xOf = (f) => ((f - startHz) / fSpan) * w

    if (points && points.length) {
      // Auto vertical range from the data with a little padding.
      let minA = Infinity
      let maxA = -Infinity
      for (const p of points) {
        if (p.amp < minA) minA = p.amp
        if (p.amp > maxA) maxA = p.amp
      }
      if (maxA - minA < 6) {
        const mid = (maxA + minA) / 2
        minA = mid - 3
        maxA = mid + 3
      }
      const pad = (maxA - minA) * 0.1
      minA -= pad
      maxA += pad
      const yOf = (a) => h - ((a - minA) / (maxA - minA)) * h

      // Filled area under the curve
      ctx.beginPath()
      ctx.moveTo(xOf(points[0].f), h)
      for (const p of points) ctx.lineTo(xOf(p.f), yOf(p.amp))
      ctx.lineTo(xOf(points[points.length - 1].f), h)
      ctx.closePath()
      const grad = ctx.createLinearGradient(0, 0, 0, h)
      grad.addColorStop(0, 'rgba(52,211,153,0.5)')
      grad.addColorStop(1, 'rgba(52,211,153,0.04)')
      ctx.fillStyle = grad
      ctx.fill()

      // Curve line
      ctx.strokeStyle = '#34d399'
      ctx.lineWidth = 1.75
      ctx.beginPath()
      points.forEach((p, i) => {
        const x = xOf(p.f)
        const y = yOf(p.amp)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()

      // Resonance marker
      if (peak && peak.frequency != null) {
        const x = xOf(peak.frequency)
        ctx.strokeStyle = '#fbbf24'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
        ctx.fillStyle = '#fbbf24'
        ctx.font = '12px ui-monospace, monospace'
        const label = `${peak.frequency.toFixed(peak.frequency < 100 ? 1 : 0)} Hz`
        ctx.fillText(label, Math.min(w - 60, x + 6), 14)
      }
    }

    // Frequency axis ticks
    ctx.fillStyle = '#4b5563'
    ctx.font = '10px ui-monospace, monospace'
    for (let i = 0; i <= 4; i++) {
      const f = startHz + (fSpan / 4) * i
      const x = (i / 4) * w
      const label = f >= 1000 ? `${(f / 1000).toFixed(1)}k` : `${Math.round(f)}`
      ctx.fillText(label, Math.min(w - 22, x + 2), h - 4)
    }
  }, [points, startHz, endHz, peak, height])

  return <canvas ref={canvasRef} className="w-full block" style={{ height }} />
}
