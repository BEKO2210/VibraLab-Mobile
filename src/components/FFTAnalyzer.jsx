import { useCallback, useEffect, useRef, useState } from 'react'
import SourceToggle from './SourceToggle'
import SpectrumChart from './charts/SpectrumChart'
import ResonanceResult from './ResonanceResult'
import PermissionGate from './PermissionGate'
import { findResonance } from '../utils/peakDetector'

/**
 * Phase 3 — FFT spectrum + automatic resonance detection.
 *
 * Reads from the shared analyzer (microphone or accelerometer FFT) so it stays
 * in sync with the Sweep tab's measurement source.
 */
export default function FFTAnalyzer({ analyzer }) {
  const { source, setSource, isMic, status, start, maxHz, nyquist, sampleRate, getSpectrum } = analyzer
  const [peak, setPeak] = useState(null)
  const peakRef = useRef(null)

  const getPeak = useCallback(() => peakRef.current, [])

  // Recompute the detected resonance a few times per second (not every frame).
  useEffect(() => {
    if (status !== 'running') {
      setPeak(null)
      peakRef.current = null
      return
    }
    const id = setInterval(() => {
      const result = getSpectrum()
      if (!result) return
      const { spectrumDb, binHz } = result
      const maxBin = Math.min(spectrumDb.length - 1, Math.ceil(maxHz / binHz))
      const detected = findResonance(spectrumDb, binHz, {
        minBin: Math.max(1, Math.ceil(5 / binHz)), // ignore < 5 Hz (DC/drift)
        maxBin,
        floorDb: isMic ? -90 : -Infinity,
      })
      peakRef.current = detected
      setPeak(detected)
    }, 200)
    return () => clearInterval(id)
  }, [status, isMic, getSpectrum, maxHz])

  const note = isMic
    ? 'Mikrofon-Quelle: voller Audio-Bereich. Stelle z.B. den Generator auf 50 Hz — der Peak sollte bei ~50 Hz erscheinen.'
    : `Akzelerometer-Quelle: nur bis ~${nyquist} Hz aussagekräftig (Nyquist bei ${Math.floor(
        sampleRate,
      )} Hz Abtastung).`

  return (
    <section className="space-y-4">
      <SourceToggle source={source} onChange={setSource} />

      <PermissionGate status={status} onRequest={start} label={isMic ? 'Mikrofon' : 'Akzelerometer'}>
        <div className="rounded-2xl bg-panel border border-edge p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">FFT-Spektrum</span>
            <span className="font-mono text-[11px] text-gray-500">0–{maxHz} Hz</span>
          </div>
          <SpectrumChart getSpectrum={getSpectrum} getPeak={getPeak} maxHz={maxHz} />
        </div>
        <ResonanceResult peak={peak} />
        <p className="text-xs text-gray-600 px-2">{note}</p>
      </PermissionGate>
    </section>
  )
}
