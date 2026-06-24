/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void: { black: '#0A0014', deep: '#15002a', panel: '#1a0238' },
        violet: { glaze: '#4B1A8C', deep: '#2e0f5e', glow: '#7a2fd6' },
        cyan: { glaze: '#00C8FF', deep: '#0091c2' },
        glaze: { pink: '#FF6FB5', cream: '#FFE9C7', gold: '#FFC857' },
        danger: '#ff3b6b',
        warn: '#ffb627',
        ok: '#3ee08a'
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      },
      boxShadow: {
        glow: '0 0 18px rgba(0,200,255,0.35)',
        void: '0 0 24px rgba(122,47,214,0.45)'
      },
      keyframes: {
        flash: {
          '0%,100%': { opacity: '0' },
          '10%': { opacity: '1' }
        },
        pulseglow: {
          '0%,100%': { boxShadow: '0 0 8px rgba(0,200,255,0.25)' },
          '50%': { boxShadow: '0 0 22px rgba(0,200,255,0.55)' }
        },
        floaty: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' }
        },
        flicker: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.65' }
        }
      },
      animation: {
        flash: 'flash 1.2s ease-out',
        pulseglow: 'pulseglow 2.4s ease-in-out infinite',
        floaty: 'floaty 4s ease-in-out infinite',
        flicker: 'flicker 3s ease-in-out infinite'
      }
    }
  },
  plugins: []
}
