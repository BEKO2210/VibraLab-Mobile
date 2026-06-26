/**
 * Toggle between the two analysis input sources.
 *   mic   → microphone (full audio range, native Web Audio FFT)
 *   accel → accelerometer (low-frequency vibration, < ~30 Hz)
 */
export default function SourceToggle({ source, onChange }) {
  const options = [
    { id: 'mic', label: '🎤 Mikrofon', hint: 'voller Bereich' },
    { id: 'accel', label: '📳 Akzelerometer', hint: '< ~30 Hz' },
  ]
  return (
    <div className="grid grid-cols-2 gap-2 card p-2">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`rounded-xl px-3 py-3 text-sm font-medium border transition-colors ${
            source === o.id
              ? 'bg-accent/15 border-accent text-accent'
              : 'bg-ink border-edge text-gray-400 active:bg-edge'
          }`}
        >
          <div>{o.label}</div>
          <div className="text-[10px] opacity-70">{o.hint}</div>
        </button>
      ))}
    </div>
  )
}
