/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        koko: {
          // surfaces
          bg: '#F5F7F2',
          surface: '#FFFFFF',
          surface2: '#FAFBF8',

          // brand · Pacific Navy
          navy: '#003366',
          navy600: '#1A4D80',
          navy700: '#002A52',
          navy800: '#001F3D',
          navy900: '#001428',

          // accent · Traceability Teal
          teal: '#1D9E75',
          teal600: '#0F6E56',
          teal400: '#5DCAA5',
          teal100: '#E7F5EE',

          // text on light
          ink: '#0F1B2D',
          body: '#374151',
          muted: '#6B7280',
          faint: '#9CA3AF',

          // borders
          border: '#E3E8EE',
          borderSoft: '#EEF2F6',

          // status
          success: '#1D9E75',
          successBg: '#E7F5EE',
          error: '#DC2626',
          errorBg: '#FEE2E2',
          warning: '#B45309',
          warningBg: '#FEF3C7',
          info: '#003366',
          infoBg: '#DBEAFE'
        }
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Cormorant Garamond"', 'Playfair Display', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Menlo', 'monospace']
      },
      fontSize: {
        // tight, readable scale
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        xs: ['0.75rem', { lineHeight: '1.1rem' }],
        sm: ['0.875rem', { lineHeight: '1.35rem' }],
        base: ['1rem', { lineHeight: '1.6rem' }],
        lg: ['1.125rem', { lineHeight: '1.7rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '1.95rem', letterSpacing: '-0.01em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.015em' }],
        '4xl': ['2.25rem', { lineHeight: '2.6rem', letterSpacing: '-0.02em' }],
        '5xl': ['3rem', { lineHeight: '3.2rem', letterSpacing: '-0.025em' }],
        '6xl': ['3.75rem', { lineHeight: '4rem', letterSpacing: '-0.03em' }],
        '7xl': ['4.5rem', { lineHeight: '4.6rem', letterSpacing: '-0.03em' }]
      },
      letterSpacing: {
        widest2: '0.22em'
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
        128: '32rem'
      },
      borderRadius: {
        lg: '0.625rem',
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem'
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(15,27,45,0.06)',
        md: '0 4px 14px -4px rgba(15,27,45,0.10), 0 2px 6px -2px rgba(15,27,45,0.05)',
        lg: '0 18px 40px -16px rgba(15,27,45,0.18), 0 8px 18px -10px rgba(15,27,45,0.08)',
        xl: '0 30px 60px -20px rgba(15,27,45,0.22)',
        ringTeal: '0 0 0 4px rgba(29,158,117,0.18)',
        ringNavy: '0 0 0 4px rgba(0,51,102,0.18)',
        ringError: '0 0 0 4px rgba(220,38,38,0.15)',
        insetTop: 'inset 0 1px 0 rgba(255,255,255,0.6)'
      },
      backgroundImage: {
        'navy-grad': 'linear-gradient(135deg, #003366 0%, #1A4D80 100%)',
        'teal-grad': 'linear-gradient(135deg, #1D9E75 0%, #5DCAA5 100%)',
        'hero-grad':
          'radial-gradient(60% 50% at 20% 0%, rgba(29,158,117,0.10), transparent 70%), radial-gradient(50% 60% at 100% 100%, rgba(0,51,102,0.10), transparent 70%)'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' }
        },
        bounceSm: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' }
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.35s ease-out both',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.8s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'bounce-sm': 'bounceSm 0.6s ease-in-out'
      },
      transitionTimingFunction: {
        'out-quint': 'cubic-bezier(0.22, 1, 0.36, 1)'
      }
    }
  },
  plugins: []
};
