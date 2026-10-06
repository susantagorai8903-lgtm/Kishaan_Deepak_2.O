/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          darkest: '#0d1711',
          dark: '#14231b',
          card: '#1c3125',
          cardHover: '#233d2f',
          border: '#2a4a37',
          accent: '#f4c042',
          accentHover: '#e3ad2c',
          leaf: '#22c55e',
          leafLight: '#4ade80',
          textMuted: '#9cb3a5',
          textLight: '#f1f5f3'
        }
      }
    },
  },
  plugins: [],
}
