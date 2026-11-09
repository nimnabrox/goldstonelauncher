/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        goldstone: {
          dark: '#080a0f',
          surface: '#0e121b',
          card: '#121826',
          gold: '#f59e0b',
          amber: '#d97706',
          yellow: '#fbbf24',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounceSubtle 2s infinite ease-in-out',
        'glow-pulse': 'glowPulse 2.5s infinite ease-in-out',
      },
      keyframes: {
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: 0.6, filter: 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.4))' },
          '50%': { opacity: 1, filter: 'drop-shadow(0 0 24px rgba(245, 158, 11, 0.8))' },
        }
      }
    },
  },
  plugins: [],
}

