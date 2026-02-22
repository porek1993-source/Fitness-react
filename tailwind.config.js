/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'sans-serif'],
        mono: ['SF Mono', 'JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        black:   '#000000',
        surface: '#0a0a0f',
        card:    '#111118',
        border:  '#1c1c28',
        muted:   '#2a2a3a',
        dim:     '#555570',
        subtle:  '#888899',
        // Apple Activity ring colors
        red:    '#ff375f',
        orange: '#ff9f0a',
        yellow: '#ffd60a',
        green:  '#30d158',
        blue:   '#0a84ff',
        indigo: '#5e5ce6',
        purple: '#bf5af2',
        teal:   '#5ac8fa',
      },
      backdropBlur: { xs: '2px' },
      animation: {
        'fade-in':    'fadeIn 0.3s ease forwards',
        'slide-up':   'slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'shimmer':    'shimmer 1.5s infinite',
        'spin-slow':  'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn:   { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideUp:  { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        shimmer:  { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      }
    }
  },
  plugins: []
}
