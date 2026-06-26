import { useCallback, useState } from 'react'
import { motion } from 'motion/react'
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
const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

export default function TapTest({ sensor, analyzer, audio, onSave }) {
  const mic = analyzer.mic
  const tap = useTapTest(sensor, mic)
  const [selfExcite, setSelfExcite] = useState(false)
  const [exciteMethod, setExciteMethod] = useState('speaker') // 'speaker' | 'vibrate'
  const [useMic, setUseMic] = useState(true)
  const [runs, setRuns] = useState(5)
  const [vibeTested, setVibeTested] = useState(null) // null | true | false
  const [saved, setSaved] = useState(false)

  const ringMax = ringdownRange(tap.ringdown)
  const getFrame = useCallback(
    () => [{ color: '#34d399', values: tap.ringdown }],
    [tap.ringdown],
  )

  // Fired once per run by the hook (audio context is unlocked in onMeasure).
  const fireExcite = () => {
    if (exciteMethod === 'vibrate' && canVibrate) navigator.vibrate(160)
    else audio?.playImpulse?.(130) // speaker click — independent of the OS motor
  }

  const onMeasure = () => {
    // Unlock audio within the user gesture; arm() runs its first excitation
    // synchronously (still in-gesture) before the mic permission prompt.
    if (selfExcite) audio?.resume?.()
    tap.arm({ selfExcite, useMic, runs, excite: selfExcite ? fireExcite : undefined })
    if (useMic && mic.status !== 'running') mic.start()
  }

  const onTestVibration = () => {
    if (!canVibrate) {
      setVibeTested(false)
      return
    }
    const ok = navigator.vibrate(200)
    setVibeTested(ok !== false)
  }

  const busy = tap.status === 'armed' || tap.status === 'capturing'

  return (
    <section className="space-y-4">
      <PermissionGate status={sensor.status} onRequest={sensor.start} label="Akzelerometer">
        {/* Options */}
        <div className="card p-4 space-y-3">
          <Toggle
            checked={selfExcite}
            onChange={() => setSelfExcite((v) => !v)}
            label="Selbst-Anregung"
            hint="Handy regt das Objekt selbst an — sonst Objekt von Hand antippen."
            disabled={busy}
          />
          {selfExcite && (
            <div className="pl-1 space-y-2">
              {/* Excitation method — speaker click is the reliable default */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'speaker', label: '🔊 Lautsprecher', hint: 'immer verfügbar' },
                  { id: 'vibrate', label: '📳 Vibration', hint: canVibrate ? 'OS-abhängig' : 'nicht unterstützt' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setExciteMethod(m.id)}
                    disabled={busy || (m.id === 'vibrate' && !canVibrate)}
                    className={`rounded-xl px-3 py-2 text-sm border transition-colors disabled:opacity-40 ${
                      exciteMethod === m.id
                        ? 'bg-accent/15 border-accent text-accent'
                        : 'bg-white/[0.04] border-white/10 text-gray-400'
                    }`}
                  >
                    <div>{m.label}</div>
                    <div className="text-[10px] opacity-70">{m.hint}</div>
                  </button>
                ))}
              </div>
              {exciteMethod === 'speaker' && (
                <p className="text-[11px] text-gray-600">
                  Kurzer Klick über die Lautsprecher regt das Objekt an — funktioniert
                  unabhängig vom Vibrationsmotor. Lautstärke aufdrehen für mehr Wirkung.
                </p>
              )}
              {exciteMethod === 'vibrate' && canVibrate && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={onTestVibration}
                    disabled={busy}
                    className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-gray-200 active:scale-95 transition-transform"
                  >
                    📳 Vibration testen
                  </button>
                  {vibeTested === true && <span className="text-xs text-accent">brummt? ✓</span>}
                  {vibeTested === false && (
                    <span className="text-xs text-warn">kein Brummen</span>
                  )}
                </div>
              )}
              {exciteMethod === 'vibrate' && (
                <p className="text-[11px] text-warn/80">
                  Vibration wird von Android im Lautlos-/Energiesparmodus oft blockiert
                  (besonders Samsung). Wenn nichts brummt: Lautsprecher-Methode nutzen.
                </p>
              )}
            </div>
          )}
          <Toggle
            checked={useMic}
            onChange={() => setUseMic((v) => !v)}
            label="Mikrofon mitnutzen"
            hint="Erfasst zusätzlich den hörbaren Klang (auch > 30 Hz)."
            disabled={busy}
          />

          {/* Number of validation runs */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm text-gray-200">
              Durchläufe
              <span className="block text-[11px] text-gray-600">
                Mehrfach messen & nur konsistentes Ergebnis zeigen.
              </span>
            </span>
            <div className="flex gap-1.5">
              {[3, 5, 8].map((n) => (
                <button
                  key={n}
                  onClick={() => setRuns(n)}
                  disabled={busy}
                  className={`w-10 py-1.5 rounded-lg text-sm border transition-colors disabled:opacity-40 ${
                    runs === n
                      ? 'bg-accent/15 border-accent text-accent'
                      : 'bg-white/[0.04] border-white/10 text-gray-400'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Big action button */}
        <motion.button
          onClick={busy ? tap.cancel : tap.status === 'done' ? tap.reset : onMeasure}
          whileTap={{ scale: 0.97 }}
          animate={
            tap.status === 'capturing'
              ? { boxShadow: ['0 0 0px rgba(52,211,153,0)', '0 0 30px -4px rgba(52,211,153,0.6)', '0 0 0px rgba(52,211,153,0)'] }
              : {}
          }
          transition={{ duration: 1.4, repeat: tap.status === 'capturing' ? Infinity : 0 }}
          className={`w-full rounded-2xl py-6 text-lg font-semibold ${
            busy
              ? 'border border-white/10 bg-white/[0.05] text-gray-200'
              : 'bg-brand-gradient text-ink shadow-glow'
          }`}
        >
          {tap.status === 'idle' && `📍 Auf Objekt legen & ${runs}× messen`}
          {tap.status === 'armed' &&
            (selfExcite
              ? `… Anregung (${tap.runInfo.current}/${tap.runInfo.total}) …`
              : `👆 Antippen (${tap.runInfo.current}/${tap.runInfo.total})`)}
          {tap.status === 'capturing' &&
            `◉ Messe… (${tap.runInfo.current}/${tap.runInfo.total})`}
          {tap.status === 'done' && '↺ Nochmal messen'}
        </motion.button>

        {tap.status === 'armed' && !selfExcite && (
          <motion.p
            className="text-center text-sm text-warn"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            Warte auf Anstoß…
          </motion.p>
        )}

        {/* Ringdown trace */}
        {tap.ringdown.length > 0 && (
          <div className="card p-4">
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

            <button
              onClick={() => {
                const best = tap.result.mic?.frequency ? tap.result.mic : tap.result.accel
                if (!best?.frequency) return
                const name = window.prompt('Name der Messung?', 'Tap-Messung')
                if (name === null) return
                onSave?.({
                  type: 'tap',
                  name: name || 'Tap-Messung',
                  frequency: best.frequency,
                  q: best.q,
                  source: best === tap.result.mic ? 'Mikrofon' : 'Akzel.',
                })
                setSaved(true)
                setTimeout(() => setSaved(false), 1500)
              }}
              className="w-full rounded-2xl py-3 text-sm font-semibold border border-white/10 bg-white/[0.05] text-gray-200 active:scale-[0.98] transition-transform"
            >
              {saved ? '✓ Im Verlauf gespeichert' : '★ Messung speichern'}
            </button>
          </div>
        )}

        <p className="text-xs text-gray-600 px-2">
          Lege das Handy flach auf das Objekt. Die App misst <strong>mehrfach</strong>
          hintereinander (bei Selbst-Anregung pingt sie pro Durchlauf; sonst jeweils antippen)
          und zeigt nur das Ergebnis, das über die Durchläufe <strong>übereinstimmt</strong> —
          mit Streuung als Verlässlichkeits-Maß. Je nach Steifigkeit liegt die Resonanz im
          Vibrations- (Akzelerometer) oder im hörbaren Bereich (Mikrofon).
        </p>
      </PermissionGate>
    </section>
  )
}

function ResultCard({ icon, title, subtitle, res, empty }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className="card p-5"
    >
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-sm text-gray-300">
          {icon} {title}
        </span>
        <span className="font-mono text-[10px] text-gray-600">{subtitle}</span>
      </div>
      {res && res.frequency ? (
        <>
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat label="Resonanz" value={formatHz(res.frequency)} accent="text-warn" big />
            <Stat label="Q-Faktor" value={formatQ(res.q)} accent="text-accent" />
            <Stat
              label="Ausschwingen"
              value={res.tau != null ? `${(res.tau * 1000).toFixed(0)} ms` : '—'}
              accent="text-accent2"
            />
          </div>
          {res.agree != null && <Agreement res={res} />}
        </>
      ) : (
        <p className="text-sm text-gray-500">{empty}</p>
      )}
    </motion.div>
  )
}

/** Confidence row: how many runs agreed and the frequency spread. */
function Agreement({ res }) {
  const ratio = res.total ? res.agree / res.total : 0
  const tone = ratio >= 0.8 ? 'text-accent' : ratio >= 0.5 ? 'text-warn' : 'text-red-400'
  const label = ratio >= 0.8 ? 'konsistent' : ratio >= 0.5 ? 'eher konsistent' : 'unsicher'
  return (
    <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
      <span className={tone}>
        ● {res.agree}/{res.total} Durchläufe stimmen überein · {label}
      </span>
      <span className="font-mono text-gray-500">±{res.spreadPct.toFixed(1)}%</span>
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
