import { useCallback, useState } from 'react'
import PermissionGate from './PermissionGate'
import LineChart from './charts/LineChart'
import { useTapTest } from '../hooks/useTapTest'
import { formatHz, formatQ } from '../utils/format'

/**
 * Phase 8 — "lay the phone on any object and measure".
 *
 * One-button tap/ping test: place the phone on the object, tap it (or let the
 * phone self-excite with its vibration motor), and read the resonance and
 * damping from the captured ringdown — structurally (accelerometer) and
 * acoustically (microphone).
 */
export default function TapTest({ sensor, analyzer }) {
  const mic = analyzer.mic
  const tap = useTapTest(sensor, mic)
  const [selfExcite, setSelfExcite] = useState(false)
  const [useMic, setUseMic] = useState(true)

  const ringMax = ringdownRange(tap.ringdown)
  const getFrame = useCallback(
    () => [{ color: '#34d399', values: tap.ringdown }],
    [tap.ringdown],
  )

  const onMeasure = () => {
    if (useMic && mic.status !== 'running') mic.start() // request mic up-front
    tap.arm({ selfExcite, useMic })
  }

  const busy = tap.status === 'armed' || tap.status === 'capturing'

  return (
    <section className="space-y-4">
      <PermissionGate status={sensor.status} onRequest={sensor.start} label="Akzelerometer">
        {/* Options */}
        <div className="rounded-2xl bg-panel border border-edge p-4 space-y-3">
          <Toggle
            checked={selfExcite}
            onChange={() => setSelfExcite((v) => !v)}
            label="Selbst-Anregung (Vibration)"
            hint="Handy pingt sich selbst per Vibrationsmotor — sonst Objekt antippen."
            disabled={busy}
          />
          <Toggle
            checked={useMic}
            onChange={() => setUseMic((v) => !v)}
            label="Mikrofon mitnutzen"
            hint="Erfasst zusätzlich den hörbaren Klang (auch > 30 Hz)."
            disabled={busy}
          />
        </div>

        {/* Big action button */}
        <button
          onClick={busy ? tap.cancel : tap.status === 'done' ? tap.reset : onMeasure}
          className={`w-full rounded-2xl py-6 text-lg font-semibold active:scale-[0.99] transition-transform ${
            busy ? 'bg-edge text-gray-200' : 'bg-accent text-ink'
          }`}
        >
          {tap.status === 'idle' && '📍 Auf Objekt legen & messen'}
          {tap.status === 'armed' && (selfExcite ? '… Anregung …' : '👆 Jetzt Objekt antippen')}
          {tap.status === 'capturing' && '◉ Messe Ausschwingen…'}
          {tap.status === 'done' && '↺ Nochmal messen'}
        </button>

        {tap.status === 'armed' && !selfExcite && (
          <p className="text-center text-sm text-warn">Warte auf Anstoß…</p>
        )}

        {/* Ringdown trace */}
        {tap.ringdown.length > 0 && (
          <div className="rounded-2xl bg-panel border border-edge p-4">
            <div className="text-sm text-gray-300 mb-2">Ausschwing-Verlauf (Akzelerometer)</div>
            <LineChart getFrame={getFrame} range={ringMax} height={140} grid={false} />
          </div>
        )}

        {/* Results */}
        {tap.result && (
          <div className="space-y-3">
            <ResultCard
              icon="📳"
              title="Vibration (Struktur)"
              subtitle={
                tap.result.accel
                  ? `≤ ~${Math.floor(tap.result.accel.nyquist)} Hz · Akzelerometer`
                  : 'Akzelerometer'
              }
              res={tap.result.accel}
              empty="Kein klarer Resonanz-Peak im Tieffrequenzbereich."
            />
            {useMic && (
              <ResultCard
                icon="🎤"
                title="Akustik (Klang)"
                subtitle="hörbarer Bereich · Mikrofon"
                res={tap.result.mic}
                empty={
                  mic.status === 'running'
                    ? 'Kein klarer Klang erfasst — lauter antippen.'
                    : 'Mikrofon nicht aktiv.'
                }
              />
            )}
          </div>
        )}

        <p className="text-xs text-gray-600 px-2">
          Lege das Handy flach auf das Objekt. Tippe das Objekt kurz an (oder aktiviere die
          Selbst-Anregung) — die App misst, wie es ausschwingt, und bestimmt Resonanzfrequenz
          und Dämpfung. Funktioniert für beliebige Objekte; je nach Steifigkeit liegt die
          Resonanz im Vibrations- oder im hörbaren Bereich.
        </p>
      </PermissionGate>
    </section>
  )
}

function ResultCard({ icon, title, subtitle, res, empty }) {
  return (
    <div className="rounded-2xl bg-panel border border-edge p-5">
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-sm text-gray-300">
          {icon} {title}
        </span>
        <span className="font-mono text-[10px] text-gray-600">{subtitle}</span>
      </div>
      {res && res.frequency ? (
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="Resonanz" value={formatHz(res.frequency)} accent="text-warn" big />
          <Stat label="Q-Faktor" value={formatQ(res.q)} accent="text-accent" />
          <Stat
            label="Ausschwingen"
            value={res.tau != null ? `${(res.tau * 1000).toFixed(0)} ms` : '—'}
            accent="text-accent2"
          />
        </div>
      ) : (
        <p className="text-sm text-gray-500">{empty}</p>
      )}
    </div>
  )
}

function Stat({ label, value, accent, big }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-gray-600 mb-1">{label}</div>
      <div className={`font-mono ${big ? 'text-2xl' : 'text-xl'} ${accent} tabular-nums`}>
        {value}
      </div>
    </div>
  )
}

function Toggle({ checked, onChange, label, hint, disabled }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className="w-full flex items-center justify-between gap-3 text-left disabled:opacity-50"
    >
      <span>
        <span className="text-sm text-gray-200 block">{label}</span>
        <span className="text-[11px] text-gray-600">{hint}</span>
      </span>
      <span
        className={`shrink-0 w-12 h-7 rounded-full p-1 transition-colors ${
          checked ? 'bg-accent' : 'bg-edge'
        }`}
      >
        <span
          className={`block w-5 h-5 rounded-full bg-ink transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </span>
    </button>
  )
}

/** Symmetric vertical range for the ringdown trace. */
function ringdownRange(arr) {
  let m = 0
  for (const v of arr) m = Math.max(m, Math.abs(v))
  return Math.max(m * 1.1, 0.5)
}
