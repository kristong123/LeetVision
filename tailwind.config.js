/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        learn: {
          light: '#10b981',
          DEFAULT: '#059669',
          dark: '#047857',
        },
        explain: {
          light: '#3b82f6',
          DEFAULT: '#2563eb',
          dark: '#1d4ed8',
        },
        improve: {
          light: '#f97316',
          DEFAULT: '#ea580c',
          dark: '#c2410c',
        },
      },
    },
  },
  darkMode: 'class',
  plugins: [],
}

