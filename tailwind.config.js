/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#020408',
          surface: '#080f1a',
          panel: '#0d1928',
          border: '#1a3a5c',
          accent: '#00d4ff',
          'accent-dim': '#0094b3',
          green: '#00ff88',
          'green-dim': '#00b35f',
          orange: '#ff6b35',
          purple: '#b44fff',
          red: '#ff3366',
          yellow: '#ffd700',
          blue: '#4fc3f7',
        },
        energy: {
          low: '#00ff88',
          medium: '#ffd700',
          high: '#ff6b35',
          critical: '#ff3366',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'cyber-grid': "linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px)",
        'glow-accent': 'radial-gradient(ellipse at center, rgba(0,212,255,0.15) 0%, transparent 70%)',
        'glow-green': 'radial-gradient(ellipse at center, rgba(0,255,136,0.15) 0%, transparent 70%)',
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      boxShadow: {
        'cyber': '0 0 20px rgba(0, 212, 255, 0.15), inset 0 1px 0 rgba(0, 212, 255, 0.1)',
        'cyber-lg': '0 0 40px rgba(0, 212, 255, 0.2), inset 0 1px 0 rgba(0, 212, 255, 0.15)',
        'glow-accent': '0 0 15px rgba(0, 212, 255, 0.5)',
        'glow-green': '0 0 15px rgba(0, 255, 136, 0.5)',
        'glow-orange': '0 0 15px rgba(255, 107, 53, 0.5)',
        'glow-red': '0 0 15px rgba(255, 51, 102, 0.5)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'scan-line': 'scanLine 3s linear infinite',
        'data-stream': 'dataStream 1s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.02)' },
        },
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        dataStream: {
          '0%': { strokeDashoffset: '100' },
          '100%': { strokeDashoffset: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
