import { useState } from 'react'
import FrequencyGenerator from './components/FrequencyGenerator'
import SensorMonitor from './components/SensorMonitor'
import FFTAnalyzer from './components/FFTAnalyzer'
import SweepPanel from './components/SweepPanel'
import TapTest from './components/TapTest'
import { useWebAudio } from './hooks/useWebAudio'
import { useSensorData } from './hooks/useSensorData'
import { useAnalyzer } from './hooks/useAnalyzer'

const TABS = [
  { id: 'generator', label: 'Gen.' },
  { id: 'sensor', label: 'Sensor' },
  { id: 'analyzer', label: 'FFT' },
  { id: 'sweep', label: 'Sweep' },
  { id: 'tap', label: 'Tap' },
]

export default function App() {
  const [tab, setTab] = useState('generator')

  // Shared instances so state persists across tab switches: the generator keeps
  // playing while you watch the analyzer, and the Analyzer + Sweep tabs read
  // from the same measurement source.
  const audio = useWebAudio()
  const sensor = useSensorData()
  const analyzer = useAnalyzer(sensor)

  return (
    <div className="min-h-full flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <header className="px-5 pt-6 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-accent text-xl">∿</span>
          <h1 className="text-lg font-semibold tracking-tight">
            VibraLab <span className="text-gray-500 font-normal">· ResoScope</span>
          </h1>
        </div>
        <p className="text-xs text-gray-600 mt-1">Resonanz- & Vibrationsanalyse</p>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 pb-28">
        {tab === 'generator' && <FrequencyGenerator audio={audio} />}
        {tab === 'sensor' && <SensorMonitor sensor={sensor} />}
        {tab === 'analyzer' && <FFTAnalyzer analyzer={analyzer} />}
        {tab === 'sweep' && <SweepPanel audio={audio} analyzer={analyzer} />}
        {tab === 'tap' && <TapTest sensor={sensor} analyzer={analyzer} />}
      </main>

      {/* Bottom tab bar — thumb-reachable */}
      <nav className="fixed bottom-0 inset-x-0 max-w-lg mx-auto border-t border-edge bg-ink/95 backdrop-blur">
        <div className="grid grid-cols-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`py-4 text-[13px] font-medium transition-colors ${
                tab === t.id ? 'text-accent' : 'text-gray-500'
              }`}
            >
              {t.label}
              {tab === t.id && <div className="h-0.5 bg-accent rounded-full mt-1 mx-3" />}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
