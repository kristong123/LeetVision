/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'learn': '#059669',
        'learn-light': '#10b981',
        'learn-dark': '#047857',
        'explain': '#2563eb',
        'explain-light': '#3b82f6',
        'explain-dark': '#1d4ed8',
        'improve': '#ea580c',
        'improve-light': '#f97316',
        'improve-dark': '#c2410c',
      },
    },
  },
  darkMode: 'class',
  plugins: [],
  safelist: [
    'bg-learn',
    'bg-learn-light',
    'bg-learn-dark',
    'bg-explain',
    'bg-explain-light',
    'bg-explain-dark',
    'bg-improve',
    'bg-improve-light',
    'bg-improve-dark',
    'hover:bg-learn-dark',
    'hover:bg-explain-dark',
    'hover:bg-improve-dark',
  ],
}

