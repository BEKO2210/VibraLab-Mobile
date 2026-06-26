import { motion, AnimatePresence } from 'motion/react'
import { formatHz, formatQ } from '../utils/format'

/** Slide-up sheet listing saved measurements. */
export default function HistorySheet({ open, onClose, history }) {
  const { entries, remove, clear } = history

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-40 max-w-lg mx-auto max-h-[80vh] flex flex-col rounded-t-3xl border-t border-white/10 bg-ink/95 backdrop-blur-2xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 36 }}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <div className="mx-auto absolute left-1/2 -translate-x-1/2 top-2 h-1 w-10 rounded-full bg-white/15" />
              <h2 className="text-base font-semibold">
                Verlauf <span className="text-gray-500 font-normal">({entries.length})</span>
              </h2>
              <div className="flex items-center gap-3">
                {entries.length > 0 && (
                  <button onClick={clear} className="text-xs text-warn">
                    Alle löschen
                  </button>
                )}
                <button onClick={onClose} className="text-gray-400 text-xl leading-none">
                  ✕
                </button>
              </div>
            </div>

            <div className="overflow-y-auto px-4 pb-8 space-y-2">
              {entries.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-10">
                  Noch keine Messungen gespeichert. Speichere ein Ergebnis im Sweep- oder Tap-Tab.
                </p>
              )}
              {entries.map((e) => (
                <div key={e.id} className="card-tight p-4 flex items-center gap-3">
                  <span className="text-xl">{e.type === 'sweep' ? '📈' : '📍'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium truncate">{e.name || 'Messung'}</span>
                      <span className="text-[10px] text-gray-600 shrink-0">
                        {new Date(e.ts).toLocaleString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="readout text-sm text-gray-400 flex gap-3 mt-0.5">
                      <span className="text-warn">{formatHz(e.frequency)}</span>
                      <span>Q {formatQ(e.q)}</span>
                      {e.source && <span className="text-gray-600">{e.source}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => remove(e.id)}
                    className="text-gray-500 text-lg px-2 active:scale-90 transition-transform"
                    aria-label="Löschen"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
