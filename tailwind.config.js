/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'vscode-bg': '#1e1e1e',
        'vscode-sidebar': '#252526',
        'vscode-activity': '#333333',
        'vscode-text': '#cccccc',
        'vscode-blue': '#007acc',
        'vscode-border': '#454545',
        'vscode-input': '#3c3c3c',
        'vscode-button': '#0e639c',
        'vscode-button-hover': '#1177bb',
        'vscode-list-hover': '#2a2d2e',
        'vscode-widget': '#252526',
        'vscode-error': '#f48771',
        'vscode-description': '#9d9d9d',

        // Semantic mappings
        'learn': '#4ec9b0', // VS Code Class/Type color
        'learn-light': '#4ec9b0',
        'learn-dark': '#4ec9b0',
        'explain': '#569cd6', // VS Code Keyword color
        'explain-light': '#9cdcfe', // VS Code Variable color
        'explain-dark': '#569cd6',
        'improve': '#ea580c', // Orange
        'improve-light': '#f97316',
        'improve-dark': '#c2410c',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      transitionProperty: {
        'theme': 'background-color, border-color, color, fill, stroke',
      },
    },
  },
  darkMode: 'class',
  plugins: [],
  safelist: [
    'bg-vscode-bg',
    'bg-vscode-sidebar',
    'bg-vscode-activity',
    'text-vscode-text',
    'border-vscode-border',
    'transition-theme',
    'duration-300',
  ],
}
