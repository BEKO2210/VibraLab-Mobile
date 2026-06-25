import { useCallback, useEffect, useRef, useState } from 'react'

const BUFFER_SECONDS = 4
const TARGET_RATE = 100 // resample target (Hz) used for the FFT buffer length

/**
 * Accelerometer access via the DeviceMotion API.
 *
 * Browsers deliver `devicemotion` at a device-dependent rate (~60 Hz on most
 * Android phones). We keep a ring buffer of the magnitude signal for the FFT
 * path, plus the latest x/y/z for the live trace, and we measure the real
 * sample rate so the FFT can map bins to Hz correctly.
 *
 * Returns { status, start, samplesRef, sampleRateRef, latest }.
 *   status: 'idle' | 'requesting' | 'running' | 'denied' | 'unsupported'
 */
export function useSensorData() {
  const [status, setStatus] = useState('idle')
  const [latest, setLatest] = useState({ x: 0, y: 0, z: 0, mag: 0, peak: 0 })

  // Ring buffer of the (gravity-removed) magnitude signal for FFT.
  const bufLenRef = useRef(TARGET_RATE * BUFFER_SECONDS)
  const samplesRef = useRef(new Float64Array(TARGET_RATE * BUFFER_SECONDS))
  const writeIdxRef = useRef(0)
  const sampleRateRef = useRef(TARGET_RATE)

  // Rolling estimate of the actual event rate.
  const lastTsRef = useRef(0)
  const dtEmaRef = useRef(1 / TARGET_RATE)
  const peakRef = useRef(0)
  const handlerRef = useRef(null)
  const baselineRef = useRef(0) // slow-moving mean to subtract static gravity

  const isSupported = typeof window !== 'undefined' && 'DeviceMotionEvent' in window

  const onMotion = useCallback((event) => {
    const acc = event.accelerationIncludingGravity || event.acceleration
    if (!acc || acc.x == null) return

    const x = acc.x || 0
    const y = acc.y || 0
    const z = acc.z || 0
    // Total magnitude, then a high-pass-ish removal of the static gravity
    // component via a slow-moving baseline so the FFT sees vibration, not 1g.
    const mag = Math.sqrt(x * x + y * y + z * z)

    // Update event-rate EMA from timestamps.
    const ts = event.timeStamp || performance.now()
    if (lastTsRef.current) {
      const dt = (ts - lastTsRef.current) / 1000
      if (dt > 0 && dt < 0.5) {
        dtEmaRef.current = dtEmaRef.current * 0.9 + dt * 0.1
        sampleRateRef.current = 1 / dtEmaRef.current
      }
    }
    lastTsRef.current = ts

    // Write magnitude (gravity-subtracted via running mean) into the ring buffer.
    baselineRef.current = baselineRef.current * 0.995 + mag * 0.005
    const ac = mag - baselineRef.current
    const buf = samplesRef.current
    buf[writeIdxRef.current] = ac
    writeIdxRef.current = (writeIdxRef.current + 1) % bufLenRef.current

    const absAc = Math.abs(ac)
    if (absAc > peakRef.current) peakRef.current = absAc

    setLatest({ x, y, z, mag: ac, peak: peakRef.current })
  }, [])

  handlerRef.current = onMotion

  const start = useCallback(async () => {
    if (!isSupported) {
      setStatus('unsupported')
      return
    }
    setStatus('requesting')

    // iOS 13+ requires an explicit permission request from a user gesture.
    const needsPermission = typeof DeviceMotionEvent.requestPermission === 'function'
    if (needsPermission) {
      try {
        const res = await DeviceMotionEvent.requestPermission()
        if (res !== 'granted') {
          setStatus('denied')
          return
        }
      } catch {
        setStatus('denied')
        return
      }
    }

    window.addEventListener('devicemotion', handlerRef.current)

    // If no events arrive shortly, the sensor is effectively unavailable
    // (e.g. desktop browser, or permission silently blocked).
    const probeStart = writeIdxRef.current
    setStatus('running')
    setTimeout(() => {
      if (writeIdxRef.current === probeStart) {
        // No samples advanced — treat as unsupported but keep listener attached
        // in case it starts late; surface the hint to the user.
        setStatus((s) => (s === 'running' ? 'unsupported' : s))
      }
    }, 1500)
  }, [isSupported])

  const resetPeak = useCallback(() => {
    peakRef.current = 0
  }, [])

  useEffect(() => {
    return () => {
      if (handlerRef.current) window.removeEventListener('devicemotion', handlerRef.current)
    }
  }, [])

  return { status, latest, start, resetPeak, samplesRef, writeIdxRef, sampleRateRef, bufLenRef }
}
