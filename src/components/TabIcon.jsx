/** Minimal line icons for the tab bar (currentColor, 24x24). */
export default function TabIcon({ name, className = 'w-5 h-5' }) {
  const common = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }
  switch (name) {
    case 'generator':
      return (
        <svg {...common}>
          <path d="M2 12c2.5 0 2.5-7 5-7s2.5 14 5 14 2.5-7 5-7h2" />
        </svg>
      )
    case 'sensor':
      return (
        <svg {...common}>
          <path d="M3 12h3l2 6 3-14 3 9 2-4 1 3h3" />
        </svg>
      )
    case 'fft':
      return (
        <svg {...common}>
          <path d="M4 20V10M9 20V5M14 20v-7M19 20v-4" />
        </svg>
      )
    case 'sweep':
      return (
        <svg {...common}>
          <path d="M3 17c4 0 5-10 9-10s5 6 9 6" />
          <path d="M17 7l4 0 0 4" />
        </svg>
      )
    case 'tap':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
        </svg>
      )
    default:
      return null
  }
}
