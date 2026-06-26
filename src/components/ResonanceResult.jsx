import { formatHz, formatQ, formatDb } from '../utils/format'

/**
 * Numeric readout of the detected resonance: peak frequency, Q factor, level.
 */
export default function ResonanceResult({ peak }) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-widest text-gray-500 mb-3">Erkannte Resonanz</div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Frequenz" value={formatHz(peak?.frequency)} accent="text-warn" big />
        <Stat label="Q-Faktor" value={formatQ(peak?.q)} accent="text-accent" />
        <Stat label="Pegel" value={formatDb(peak?.level)} accent="text-accent2" />
      </div>
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
