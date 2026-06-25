import { useEffect, useRef } from 'react'

/**
 * Real-time FFT spectrum on a Canvas.
 *
 * `getSpectrum()` returns { spectrumDb, binHz } or null. We draw bins up to
 * `maxHz`, map dB onto a fixed [minDb, maxDb] vertical scale, and highlight the
 * detected resonance bin via `getPeak()` → { frequency } | null.
 */
export default function SpectrumChart({
  getSpectrum,
  getPeak,
  maxHz = 2000,
  minDb = -100,
  maxDb = 0,
  height = 240,
}) {
  const canvasRef = useRef(null)
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth
      canvas.width = Math.max(1, Math.floor(w * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const dbToY = (db, h) => {
      const t = (db - minDb) / (maxDb - minDb) // 0..1
      return h - Math.max(0, Math.min(1, t)) * h
    }

    const draw = () => {
      const w = canvas.clientWidth
      const h = height
      ctx.clearRect(0, 0, w, h)

      const result = getSpectrum?.()
      if (result) {
        const { spectrumDb, binHz } = result
        const maxBin = Math.min(spectrumDb.length - 1, Math.ceil(maxHz / binHz))

        // Filled spectrum
        ctx.beginPath()
        ctx.moveTo(0, h)
        for (let i = 0; i <= maxBin; i++) {
          const x = (i / maxBin) * w
          const y = dbToY(spectrumDb[i], h)
          ctx.lineTo(x, y)
        }
        ctx.lineTo(w, h)
        ctx.closePath()
        const grad = ctx.createLinearGradient(0, 0, 0, h)
        grad.addColorStop(0, 'rgba(56,189,248,0.6)')
        grad.addColorStop(1, 'rgba(56,189,248,0.05)')
        ctx.fillStyle = grad
        ctx.fill()

        ctx.strokeStyle = '#38bdf8'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        for (let i = 0; i <= maxBin; i++) {
          const x = (i / maxBin) * w
          const y = dbToY(spectrumDb[i], h)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()

        // Resonance marker
        const peak = getPeak?.()
        if (peak && peak.frequency != null && peak.frequency <= maxHz) {
          const x = (peak.frequency / maxHz) * w
          ctx.strokeStyle = '#fbbf24'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x, h)
          ctx.stroke()
          ctx.fillStyle = '#fbbf24'
          ctx.font = '12px ui-monospace, monospace'
          const label = `${peak.frequency.toFixed(peak.frequency < 100 ? 1 : 0)} Hz`
          const tx = Math.min(w - 60, x + 6)
          ctx.fillText(label, tx, 14)
        }
      }

      // Frequency axis ticks
      ctx.fillStyle = '#4b5563'
      ctx.font = '10px ui-monospace, monospace'
      for (let f = 0; f <= maxHz; f += maxHz / 4) {
        const x = (f / maxHz) * w
        const label = f >= 1000 ? `${(f / 1000).toFixed(1)}k` : `${f}`
        ctx.fillText(label, Math.min(w - 20, x + 2), h - 4)
      }

      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [getSpectrum, getPeak, maxHz, minDb, maxDb, height])

  return <canvas ref={canvasRef} className="w-full block" style={{ height }} />
}
