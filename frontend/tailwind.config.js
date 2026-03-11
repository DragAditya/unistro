/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:       '#070b14',
        surface:  '#0f1520',
        elevated: '#1a2035',
        border:   '#2a3550',
        primary:  '#00c9b8',
        accent:   '#a78bfa',
        muted:    '#64748b',
        danger:   '#f87171',
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:   { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        scaleIn:   { from: { opacity: 0, transform: 'scale(0.95)' }, to: { opacity: 1, transform: 'scale(1)' } },
      },
      animation: {
        fadeIn:  'fadeIn 0.2s ease',
        slideUp: 'slideUp 0.25s ease',
        scaleIn: 'scaleIn 0.2s ease',
      }
    }
  },
  plugins: []
}
