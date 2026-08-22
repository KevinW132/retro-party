/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0a0a12',
        panel: '#12121e',
        panel2: '#181826',
        arcade: {
          purple: '#a855f7',
          blue: '#38bdf8',
          green: '#39ff88',
          yellow: '#ffd23f',
          pink: '#ff3ea5',
        },
      },
      fontFamily: {
        arcade: ['"Press Start 2P"', 'system-ui', 'monospace'],
        mono: ['ui-monospace', 'Menlo', 'Consolas', 'monospace'],
        handwriting: ['"Caveat"', 'cursive'],
        letter: ['"EB Garamond"', 'Georgia', 'serif'],
      },
      boxShadow: {
        glow: '0 0 8px currentColor, 0 0 24px currentColor',
        pixel: '4px 4px 0 0 rgba(0,0,0,0.6)',
      },
      keyframes: {
        scanlines: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '0 8px' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '92%': { opacity: '1' },
          '93%': { opacity: '0.86' },
          '94%': { opacity: '1' },
        },
        pop: {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '60%': { transform: 'scale(1.08)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        scanlines: 'scanlines 1s linear infinite',
        flicker: 'flicker 6s infinite',
        pop: 'pop 0.35s ease-out',
      },
    },
  },
  plugins: [],
};
