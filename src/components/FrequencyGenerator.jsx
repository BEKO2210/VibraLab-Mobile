import { useEffect } from 'react'
import { formatHz } from '../utils/format'
import { clamp } from '../utils/format'

const WAVEFORMS = [
  { id: 'sine', label: 'Sinus' },
  { id: 'square', label: 'Rechteck' },
  { id: 'triangle', label: 'Dreieck' },
  { id: 'sawtooth', label: 'Sägezahn' },
]

const MIN_HZ = 10
const MAX_HZ = 2000

/**
 * Phase 1 — Frequency generator UI.
 * Drives the shared useWebAudio instance passed in via `audio`.
 */
export default function FrequencyGenerator({ audio }) {
  const { isPlaying, frequency, amplitude, waveform, play, stop, setFrequency, setAmplitude, setWaveform } = audio

  // Stop the tone if the component unmounts while playing.
  useEffect(() => {
    return () => {
      if (isPlaying) stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onFreqInput = (e) => {
    const v = clamp(Number(e.target.value) || MIN_HZ, MIN_HZ, MAX_HZ)
    setFrequency(v)
  }

  return (
    <section className="space-y-6">
      {/* Big readout */}
      <div className="rounded-2xl bg-panel border border-edge p-6 text-center">
        <div className="text-xs uppercase tracking-widest text-gray-500 mb-1">Frequenz</div>
        <div className="font-mono text-5xl font-semibold text-accent tabular-nums">
          {formatHz(frequency)}
        </div>
        <div className="mt-1 font-mono text-sm text-gray-500">
          Amplitude {Math.round(amplitude * 100)}%
        </div>
      </div>

      {/* Frequency slider */}
      <div className="rounded-2xl bg-panel border border-edge p-5 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-300">Frequenz ({MIN_HZ}–{MAX_HZ} Hz)</label>
          <input
            type="number"
            inputMode="numeric"
            min={MIN_HZ}
            max={MAX_HZ}
            value={Math.round(frequency)}
            onChange={onFreqInput}
            className="w-24 rounded-lg bg-ink border border-edge px-2 py-1 text-right font-mono text-accent"
          />
        </div>
        <input
          type="range"
          min={MIN_HZ}
          max={MAX_HZ}
          step={1}
          value={frequency}
          onChange={(e) => setFrequency(Number(e.target.value))}
        />
        <div className="flex justify-between font-mono text-[11px] text-gray-600">
          <span>{MIN_HZ} Hz</span>
          <span>1 kHz</span>
          <span>{MAX_HZ} Hz</span>
        </div>
      </div>

      {/* Amplitude slider */}
      <div className="rounded-2xl bg-panel border border-edge p-5 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-300">Amplitude</label>
          <span className="font-mono text-accent">{Math.round(amplitude * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(amplitude * 100)}
          onChange={(e) => setAmplitude(Number(e.target.value) / 100)}
        />
      </div>

      {/* Waveform selector */}
      <div className="rounded-2xl bg-panel border border-edge p-5">
        <label className="text-sm text-gray-300 mb-3 block">Wellenform</label>
        <div className="grid grid-cols-2 gap-2">
          {WAVEFORMS.map((w) => (
            <button
              key={w.id}
              onClick={() => setWaveform(w.id)}
              className={`rounded-xl px-3 py-3 text-sm font-medium border transition-colors ${
                waveform === w.id
                  ? 'bg-accent/15 border-accent text-accent'
                  : 'bg-ink border-edge text-gray-400 active:bg-edge'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transport */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={play}
          disabled={isPlaying}
          className="rounded-2xl py-5 text-lg font-semibold bg-accent text-ink disabled:opacity-40 active:scale-[0.99] transition-transform"
        >
          ▶ Play
        </button>
        <button
          onClick={stop}
          disabled={!isPlaying}
          className="rounded-2xl py-5 text-lg font-semibold bg-edge text-gray-200 disabled:opacity-40 active:scale-[0.99] transition-transform"
        >
          ■ Stop
        </button>
      </div>

      <p className="text-center text-xs text-gray-600 px-4">
        Stelle das Handy mit dem Lautsprecher ans Objekt. Die Tonausgabe regt das Objekt an —
        die Antwort misst du im Analyzer-Tab.
      </p>
    </section>
  )
}
