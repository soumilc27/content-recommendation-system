module.exports = {
  content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        olive: {
          50: '#fafaf8',
          100: '#f3f2ee',
          200: '#ede8dd',
          300: '#e0d9c3',
          400: '#c9b89f',
          500: '#a89c76',
          600: '#8b7d5f',
          700: '#6b6447',
          800: '#524d39',
          900: '#413a2d',
          950: '#2a2620',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

