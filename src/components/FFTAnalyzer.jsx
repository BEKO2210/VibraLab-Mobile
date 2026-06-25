import { useCallback, useEffect, useRef, useState } from 'react'
import SourceToggle from './SourceToggle'
import SpectrumChart from './charts/SpectrumChart'
import ResonanceResult from './ResonanceResult'
import PermissionGate from './PermissionGate'
import { useMicrophone } from '../hooks/useMicrophone'
import { useFFT } from '../hooks/useFFT'
import { findResonance } from '../utils/peakDetector'

/**
 * Phase 3 — FFT spectrum + automatic resonance detection.
 *
 * Two input sources share the same downstream pipeline (spectrum → peak):
 *   - microphone: AnalyserNode supplies the dB spectrum directly
 *   - accelerometer: useFFT runs a windowed FFT over the sensor ring buffer
 */
export default function FFTAnalyzer({ sensor }) {
  const [source, setSource] = useState('mic')
  const [peak, setPeak] = useState(null)

  const mic = useMicrophone()
  const accelFFT = useFFT(sensor)

  // Live ref so the chart's RAF loop and the peak interval read the same fn.
  const peakRef = useRef(null)

  // Pick the active spectrum provider + display range for the current source.
  const isMic = source === 'mic'
  const sensorNyquist = Math.floor(sensor.sampleRateRef.current / 2)
  const maxHz = isMic ? 2000 : Math.max(10, sensorNyquist)

  const getSpectrum = useCallback(() => {
    return isMic ? mic.getSpectrum() : accelFFT.getSpectrum()
  }, [isMic, mic, accelFFT])

  const getPeak = useCallback(() => peakRef.current, [])

  // Recompute the detected resonance a few times per second (not every frame).
  useEffect(() => {
    const active = isMic ? mic.status === 'running' : sensor.status === 'running'
    if (!active) {
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
  }, [isMic, mic.status, sensor.status, getSpectrum, maxHz])

  return (
    <section className="space-y-4">
      <SourceToggle source={source} onChange={setSource} />

      {isMic ? (
        <PermissionGate status={mic.status} onRequest={mic.start} label="Mikrofon">
          <AnalyzerView
            getSpectrum={getSpectrum}
            getPeak={getPeak}
            peak={peak}
            maxHz={maxHz}
            note="Mikrofon-Quelle: voller Audio-Bereich. Stelle z.B. den Generator auf 50 Hz — der Peak sollte bei ~50 Hz erscheinen."
          />
        </PermissionGate>
      ) : (
        <PermissionGate status={sensor.status} onRequest={sensor.start} label="Akzelerometer">
          <AnalyzerView
            getSpectrum={getSpectrum}
            getPeak={getPeak}
            peak={peak}
            maxHz={maxHz}
            note={`Akzelerometer-Quelle: nur bis ~${sensorNyquist} Hz aussagekräftig (Nyquist bei ${Math.floor(
              sensor.sampleRateRef.current,
            )} Hz Abtastung).`}
          />
        </PermissionGate>
      )}
    </section>
  )
}

function AnalyzerView({ getSpectrum, getPeak, peak, maxHz, note }) {
  return (
    <>
      <div className="rounded-2xl bg-panel border border-edge p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">FFT-Spektrum</span>
          <span className="font-mono text-[11px] text-gray-500">0–{maxHz} Hz</span>
        </div>
        <SpectrumChart getSpectrum={getSpectrum} getPeak={getPeak} maxHz={maxHz} />
      </div>
      <ResonanceResult peak={peak} />
      <p className="text-xs text-gray-600 px-2">{note}</p>
    </>
  )
}
