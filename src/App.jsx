import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import FrequencyGenerator from './components/FrequencyGenerator'
import SensorMonitor from './components/SensorMonitor'
import FFTAnalyzer from './components/FFTAnalyzer'
import SweepPanel from './components/SweepPanel'
import TapTest from './components/TapTest'
import Logo from './components/Logo'
import AnimatedBackground from './components/AnimatedBackground'
import TabIcon from './components/TabIcon'
import HistorySheet from './components/HistorySheet'
import { useWebAudio } from './hooks/useWebAudio'
import { useSensorData } from './hooks/useSensorData'
import { useAnalyzer } from './hooks/useAnalyzer'
import { useHistory } from './hooks/useHistory'

const TABS = [
  { id: 'generator', label: 'Gen.', icon: 'generator' },
  { id: 'sensor', label: 'Sensor', icon: 'sensor' },
  { id: 'analyzer', label: 'FFT', icon: 'fft' },
  { id: 'sweep', label: 'Sweep', icon: 'sweep' },
  { id: 'tap', label: 'Tap', icon: 'tap' },
]

export default function App() {
  const [tab, setTab] = useState('generator')
  const [historyOpen, setHistoryOpen] = useState(false)

  // Shared instances so state persists across tab switches.
  const audio = useWebAudio()
  const sensor = useSensorData()
  const analyzer = useAnalyzer(sensor)
  const history = useHistory()

  return (
    <div className="relative min-h-full flex flex-col max-w-lg mx-auto">
      <AnimatedBackground />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="px-5 pt-7 pb-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Logo size={34} />
          <div className="leading-tight">
            <h1 className="text-lg font-semibold tracking-tight">
              <span className="gradient-text">VibraLab</span>
              <span className="text-gray-500 font-normal"> · ResoScope</span>
            </h1>
            <p className="text-[11px] text-gray-500 tracking-wide">Resonanz- & Vibrationsanalyse</p>
          </div>
        </div>
        <button
          onClick={() => setHistoryOpen(true)}
          className="relative rounded-xl border border-white/10 bg-white/[0.05] p-2.5 text-gray-300 active:scale-95 transition-transform"
          aria-label="Verlauf"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v5h5" />
            <path d="M3.05 13A9 9 0 106 5.3L3 8" />
            <path d="M12 7v5l3 2" />
          </svg>
          {history.entries.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-brand-gradient text-ink text-[10px] font-bold flex items-center justify-center px-1">
              {history.entries.length}
            </span>
          )}
        </button>
      </motion.header>

      {/* Content with page transitions */}
      <main className="flex-1 px-4 pb-28">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {tab === 'generator' && <FrequencyGenerator audio={audio} />}
            {tab === 'sensor' && <SensorMonitor sensor={sensor} />}
            {tab === 'analyzer' && <FFTAnalyzer analyzer={analyzer} />}
            {tab === 'sweep' && (
              <SweepPanel audio={audio} analyzer={analyzer} onSave={history.add} />
            )}
            {tab === 'tap' && (
              <TapTest sensor={sensor} analyzer={analyzer} audio={audio} onSave={history.add} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <HistorySheet open={historyOpen} onClose={() => setHistoryOpen(false)} history={history} />

      {/* Bottom tab bar — frosted glass, spring active indicator */}
      <nav className="fixed bottom-0 inset-x-0 max-w-lg mx-auto z-20">
        <div className="mx-3 mb-3 rounded-2xl border border-white/10 bg-ink/70 backdrop-blur-2xl shadow-card">
          <div className="grid grid-cols-5">
            {TABS.map((t) => {
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="relative flex flex-col items-center gap-1 py-3"
                >
                  {active && (
                    <motion.div
                      layoutId="tab-pill"
                      className="absolute inset-1 rounded-xl bg-white/[0.06] border border-white/10"
                      transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    />
                  )}
                  <span
                    className={`relative transition-colors ${
                      active ? 'text-accent' : 'text-gray-500'
                    }`}
                  >
                    <TabIcon name={t.icon} />
                  </span>
                  <span
                    className={`relative text-[11px] font-medium transition-colors ${
                      active ? 'text-accent' : 'text-gray-500'
                    }`}
                  >
                    {t.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>
    </div>
  )
}
