/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Neutral technical surface palette (dark IDE-like tool)
        surface: {
          0: '#0b0e14',
          1: '#11151f',
          2: '#161c28',
          3: '#1e2634',
          border: '#2a3444',
        },
        accent: {
          DEFAULT: '#4f9cff',
          soft: '#1e3a5f',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
