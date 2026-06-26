/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        // Instrument / premium-dark palette
        ink: '#05070d', // base background (deep near-black)
        panel: '#0c1118', // raised surface
        edge: '#1b2330', // hairline borders
        accent: '#34d399', // emerald — primary signal
        cyan: '#22d3ee', // cyan — brand gradient partner
        accent2: '#38bdf8', // sky — secondary trace
        warn: '#fbbf24', // amber — resonance marker
      },
      boxShadow: {
        glow: '0 0 24px -4px rgba(52,211,153,0.45)',
        'glow-cyan': '0 0 28px -6px rgba(34,211,238,0.5)',
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 12px 32px -16px rgba(0,0,0,0.8)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(100deg,#22d3ee 0%,#34d399 60%,#a7f3d0 100%)',
      },
      keyframes: {
        aurora: {
          '0%,100%': { transform: 'translate3d(-8%,-6%,0) scale(1.1)', opacity: '0.55' },
          '50%': { transform: 'translate3d(8%,6%,0) scale(1.25)', opacity: '0.8' },
        },
        floaty: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        aurora: 'aurora 16s ease-in-out infinite',
        'aurora-slow': 'aurora 24s ease-in-out infinite',
        floaty: 'floaty 5s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [],
}
