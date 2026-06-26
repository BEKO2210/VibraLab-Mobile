import { useCallback, useEffect, useRef } from 'react'
import PermissionGate from './PermissionGate'
import LineChart from './charts/LineChart'

const DISPLAY_POINTS = 240 // ~ a few seconds of scroll history

/**
 * Phase 2 — live accelerometer monitor.
 * Shows scrolling x/y/z traces (gravity included) plus the running peak.
 */
export default function SensorMonitor({ sensor }) {
  const { status, latest, start, resetPeak, sampleRateRef } = sensor

  // Display ring buffers per axis (decoupled from the FFT buffer in the hook).
  const bufX = useRef(new Array(DISPLAY_POINTS).fill(0))
  const bufY = useRef(new Array(DISPLAY_POINTS).fill(0))
  const bufZ = useRef(new Array(DISPLAY_POINTS).fill(0))

  // Push the newest sample on each update from the hook.
  useEffect(() => {
    bufX.current.push(latest.x)
    bufX.current.shift()
    bufY.current.push(latest.y)
    bufY.current.shift()
    bufZ.current.push(latest.z)
    bufZ.current.shift()
  }, [latest])

  const getFrame = useCallback(
    () => [
      { color: '#34d399', values: bufX.current }, // X — green
      { color: '#38bdf8', values: bufY.current }, // Y — blue
      { color: '#fbbf24', values: bufZ.current }, // Z — orange
    ],
    [],
  )

  return (
    <section className="space-y-4">
      <PermissionGate status={status} onRequest={start} label="Akzelerometer">
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Beschleunigung (m/s²)</span>
            <span className="font-mono text-[11px] text-gray-500">
              {sampleRateRef.current.toFixed(0)} Hz
            </span>
          </div>
          {/* range ±20 m/s² covers gravity (~9.8) plus vibration headroom */}
          <LineChart getFrame={getFrame} range={20} height={200} />
          <div className="flex justify-between font-mono text-xs">
            <span className="text-accent">X {latest.x.toFixed(2)}</span>
            <span className="text-accent2">Y {latest.y.toFixed(2)}</span>
            <span className="text-warn">Z {latest.z.toFixed(2)}</span>
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-gray-500">Peak (AC)</div>
            <div className="font-mono text-2xl text-accent">{latest.peak.toFixed(3)}</div>
          </div>
          <button
            onClick={resetPeak}
            className="rounded-xl bg-edge text-gray-200 px-4 py-2 text-sm active:scale-95 transition-transform"
          >
            Reset
          </button>
        </div>

        <p className="text-xs text-gray-600 px-2">
          Das Akzelerometer liefert nur ~{sampleRateRef.current.toFixed(0)} Messungen/s → die
          FFT erkennt damit Resonanzen nur bis ~{Math.floor(sampleRateRef.current / 2)} Hz
          (Nyquist). Für höhere Frequenzen nutze im Analyzer die Mikrofon-Quelle.
        </p>
      </PermissionGate>
    </section>
  )
}
