import { useState } from 'react'
import SourceToggle from './SourceToggle'
import PermissionGate from './PermissionGate'
import ResponseChart from './charts/ResponseChart'
import ResonanceResult from './ResonanceResult'
import { useSweep } from '../hooks/useSweep'
import { exportSweepCsv } from '../utils/dataExport'
import { clamp } from '../utils/format'

const ABS_MIN = 10
const ABS_MAX = 2000

/**
 * Phase 4 — automated swept-sine measurement UI.
 * Drives the generator across a frequency range and plots the response curve.
 */
export default function SweepPanel({ audio, analyzer }) {
  const sweep = useSweep(audio, analyzer)
  const [startHz, setStartHz] = useState(20)
  const [endHz, setEndHz] = useState(500)
  const [speed, setSpeed] = useState(50) // Hz/s

  // The accelerometer can only measure up to its Nyquist limit.
  const sourceMax = analyzer.isMic ? ABS_MAX : analyzer.maxHz
  const effectiveEnd = clamp(endHz, startHz + 1, sourceMax)
  const running = sweep.status === 'running'

  const onStart = () => {
    sweep.run({ startHz, endHz: effectiveEnd, speed })
  }

  const estSeconds = Math.max(0.5, (effectiveEnd - startHz) / speed)

  return (
    <section className="space-y-4">
      <SourceToggle source={analyzer.source} onChange={analyzer.setSource} />

      <PermissionGate
        status={analyzer.status}
        onRequest={analyzer.start}
        label={analyzer.isMic ? 'Mikrofon' : 'Akzelerometer'}
      >
        {/* Range + speed controls */}
        <div className="rounded-2xl bg-panel border border-edge p-5 space-y-5">
          <Field label="Start" value={startHz} unit="Hz">
            <input
              type="range"
              min={ABS_MIN}
              max={sourceMax - 1}
              value={startHz}
              disabled={running}
              onChange={(e) => setStartHz(clamp(Number(e.target.value), ABS_MIN, sourceMax - 1))}
            />
          </Field>

          <Field label="Ende" value={effectiveEnd} unit="Hz">
            <input
              type="range"
              min={ABS_MIN + 1}
              max={sourceMax}
              value={effectiveEnd}
              disabled={running}
              onChange={(e) => setEndHz(clamp(Number(e.target.value), ABS_MIN + 1, sourceMax))}
            />
          </Field>

          <Field label="Geschwindigkeit" value={speed} unit="Hz/s">
            <input
              type="range"
              min={2}
              max={200}
              value={speed}
              disabled={running}
              onChange={(e) => setSpeed(Number(e.target.value))}
            />
          </Field>

          <div className="flex justify-between font-mono text-[11px] text-gray-500">
            <span>≈ {estSeconds.toFixed(1)} s Dauer</span>
            {!analyzer.isMic && <span className="text-warn">Akzel.-Limit {sourceMax} Hz</span>}
          </div>
        </div>

        {/* Transport + progress */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onStart}
              disabled={running}
              className="rounded-2xl py-4 text-lg font-semibold bg-accent text-ink disabled:opacity-40 active:scale-[0.99] transition-transform"
            >
              ▶ Sweep starten
            </button>
            <button
              onClick={running ? sweep.cancel : sweep.reset}
              className="rounded-2xl py-4 text-lg font-semibold bg-edge text-gray-200 active:scale-[0.99] transition-transform"
            >
              {running ? '■ Stop' : '↺ Reset'}
            </button>
          </div>
          <div className="h-2 rounded-full bg-edge overflow-hidden">
            <div
              className="h-full bg-accent transition-[width] duration-100"
              style={{ width: `${Math.round(sweep.progress * 100)}%` }}
            />
          </div>
        </div>

        {/* Response curve */}
        <div className="rounded-2xl bg-panel border border-edge p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">Amplituden-Response</span>
            <span className="font-mono text-[11px] text-gray-500">
              {sweep.points.length} Punkte
            </span>
          </div>
          <ResponseChart
            points={sweep.points}
            startHz={startHz}
            endHz={effectiveEnd}
            peak={sweep.result}
          />
        </div>

        <ResonanceResult peak={sweep.result} />

        {/* Export */}
        <button
          onClick={() =>
            exportSweepCsv(sweep.points, {
              source: analyzer.source,
              startHz,
              endHz: effectiveEnd,
              speed,
              result: sweep.result,
            })
          }
          disabled={!sweep.points.length}
          className="w-full rounded-2xl py-3 text-sm font-semibold bg-edge text-gray-200 disabled:opacity-40 active:scale-[0.99] transition-transform"
        >
          ⬇ CSV exportieren
        </button>

        <p className="text-xs text-gray-600 px-2">
          Halte das Handy mit dem Lautsprecher an das Objekt. Der Sweep fährt die Frequenzen
          ab und misst die Antwort der gewählten Quelle — der höchste Punkt der Kurve ist die
          Resonanzfrequenz. Langsamer = genauer.
        </p>
      </PermissionGate>
    </section>
  )
}

function Field({ label, value, unit, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-300">{label}</label>
        <span className="font-mono text-accent">
          {Math.round(value)} <span className="text-gray-500">{unit}</span>
        </span>
      </div>
      {children}
    </div>
  )
}
