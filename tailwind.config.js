/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        koko: {
          navy: '#0b1d3a',
          deep: '#06122a',
          ocean: '#142e5e',
          accent: '#e0a458',
          cacao: '#5b3a1a',
          mist: '#cdd9ec'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      boxShadow: {
        koko: '0 10px 30px -10px rgba(11,29,58,0.45)'
      }
    }
  },
  plugins: []
};
