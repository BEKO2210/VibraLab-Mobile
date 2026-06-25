/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        // Tech / oscilloscope palette
        ink: '#0a0e14',
        panel: '#11161f',
        edge: '#1e2632',
        accent: '#34d399', // green — signal
        accent2: '#38bdf8', // blue — secondary trace
        warn: '#fbbf24', // orange — resonance marker
      },
    },
  },
  plugins: [],
}
