import { useEffect, useRef } from 'react'

/**
 * Scrolling real-time line chart on a Canvas.
 *
 * `seriesRef` is a ref to an array of { color, data: Float32Array-like ring }
 * OR we read from a getter. To keep it simple and allocation-free, the parent
 * passes a `getFrame()` that returns an array of { color, values:number[] }
 * already ordered oldest→newest, plus a fixed vertical `range`.
 *
 * Drawing runs on its own requestAnimationFrame loop for smooth 60 FPS.
 */
export default function LineChart({ getFrame, range = 4, height = 200, grid = true }) {
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

    const draw = () => {
      const w = canvas.clientWidth
      const h = height
      ctx.clearRect(0, 0, w, h)

      // Background grid
      if (grid) {
        ctx.strokeStyle = '#1e2632'
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let i = 1; i < 4; i++) {
          const y = (h / 4) * i
          ctx.moveTo(0, y)
          ctx.lineTo(w, y)
        }
        ctx.stroke()
        // zero line
        ctx.strokeStyle = '#2b3645'
        ctx.beginPath()
        ctx.moveTo(0, h / 2)
        ctx.lineTo(w, h / 2)
        ctx.stroke()
      }

      const frame = getFrame()
      if (frame && frame.length) {
        const mid = h / 2
        const scale = mid / range
        for (const series of frame) {
          const values = series.values
          const n = values.length
          if (!n) continue
          ctx.strokeStyle = series.color
          ctx.lineWidth = 1.5
          ctx.beginPath()
          for (let i = 0; i < n; i++) {
            const x = (i / (n - 1)) * w
            const y = mid - values[i] * scale
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.stroke()
        }
      }

      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [getFrame, range, height, grid])

  return <canvas ref={canvasRef} className="w-full block" style={{ height }} />
}
