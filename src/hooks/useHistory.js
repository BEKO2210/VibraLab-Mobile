import { useCallback, useEffect, useState } from 'react'

const KEY = 'vibralab.history.v1'
const MAX = 100

/** Persistent measurement history backed by localStorage. */
export function useHistory() {
  const [entries, setEntries] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(entries))
    } catch {
      /* storage full or unavailable — keep in-memory */
    }
  }, [entries])

  const add = useCallback((entry) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const full = { id, ts: Date.now(), ...entry }
    setEntries((prev) => [full, ...prev].slice(0, MAX))
    return full
  }, [])

  const remove = useCallback((id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const clear = useCallback(() => setEntries([]), [])

  return { entries, add, remove, clear }
}
