import { motion } from 'motion/react'

/**
 * Animated waveform logo — a live resonance trace.
 * The path "scans" via a moving dash highlight and a glowing dot rides the wave,
 * giving the mark an instrument-like, alive feel.
 */
export default function Logo({ size = 36 }) {
  // A damped-resonance-ish path across a 100x40 viewBox.
  const wave = 'M2 20 H16 L24 8 L32 33 L40 12 L48 26 L56 18 H98'

  return (
    <svg width={size * (100 / 40)} height={size} viewBox="0 0 100 40" fill="none" aria-label="VibraLab">
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="0.6" stopColor="#34d399" />
          <stop offset="1" stopColor="#a7f3d0" />
        </linearGradient>
        <filter id="logoGlow" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Faint full trace */}
      <path d={wave} stroke="url(#logoGrad)" strokeOpacity="0.18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Bright scanning segment */}
      <motion.path
        d={wave}
        stroke="url(#logoGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#logoGlow)"
        strokeDasharray="26 200"
        initial={{ strokeDashoffset: 226 }}
        animate={{ strokeDashoffset: 0 }}
        transition={{ duration: 2.6, ease: 'easeInOut', repeat: Infinity }}
      />

      {/* Pulsing node at the main resonance peak */}
      <motion.circle
        cx="32"
        cy="33"
        r="2.6"
        fill="#fbbf24"
        animate={{ scale: [1, 1.6, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.8, ease: 'easeInOut', repeat: Infinity }}
        style={{ transformOrigin: '32px 33px' }}
      />
    </svg>
  )
}
