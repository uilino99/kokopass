/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        koko: {
          ink: '#0c0805',
          deep: '#0c0805',
          noir: '#15100a',
          navy: '#15100a',
          panel: '#1f1810',
          ocean: '#1f1810',
          espresso: '#2a2014',
          gold: '#d4a64a',
          accent: '#d4a64a',
          goldSoft: '#a87f33',
          ivory: '#f4ead7',
          mist: '#b8a890',
          muted: '#7a6a55',
          cacao: '#5b3a1a'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'Playfair Display', 'Georgia', 'serif'],
        display: ['"Cormorant Garamond"', 'Playfair Display', 'Georgia', 'serif']
      },
      letterSpacing: {
        wider2: '0.18em'
      },
      boxShadow: {
        koko: '0 30px 60px -25px rgba(0,0,0,0.65)',
        gold: '0 10px 28px -14px rgba(212,166,74,0.5)',
        inset: 'inset 0 1px 0 rgba(244,234,215,0.05)'
      },
      backgroundImage: {
        'gold-grad': 'linear-gradient(135deg, #d4a64a 0%, #a87f33 100%)',
        'gold-rule': 'linear-gradient(90deg, transparent, rgba(212,166,74,0.6), transparent)',
        'noir-grad':
          'radial-gradient(120% 80% at 0% 0%, #1f1810 0%, #15100a 45%, #0c0805 100%)'
      }
    }
  },
  plugins: []
};
