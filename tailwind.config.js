/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FBF6EF',
          100: '#F3E7D3',
          200: '#E4C9A0',
          300: '#D3A66C',
          400: '#C08847',
          500: '#A8662E',
          600: '#8A4F23',
          700: '#6C3D1C',
          800: '#4E2C15',
          900: '#301B0D',
        },
        ink: {
          50: '#F4F5F5',
          100: '#E4E6E6',
          300: '#A9AEAF',
          500: '#5C6567',
          700: '#33393B',
          900: '#1B1F20',
        },
        teal: {
          500: '#2E6E6A',
          600: '#235452',
        },
        gold: {
          400: '#D9A441',
          500: '#BC8A2C',
        },
        danger: '#B14A3C',
        success: '#3E7D5A',
        warn: '#C0872F',
        surface: '#FBF9F5',
        card: '#FFFFFF',
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '6px',
      },
      boxShadow: {
        card: '0 1px 0 0 rgb(27 31 32 / 0.04)',
      },
    },
  },
  plugins: [],
};
