/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'chess-dark': '#312e2b',
        'chess-darker': '#272522',
        'chess-green': '#81b64c',
        'chess-blue': '#58a6ff',
        'chess-cyan': '#56d9fe',
        'chess-yellow': '#ffd43b',
        'chess-orange': '#ff8c42',
        'chess-red': '#ff4757',
      },
    },
  },
  plugins: [],
}
