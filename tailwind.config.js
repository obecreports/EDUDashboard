/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        tm: {
          blue: '#0A2A5C',
          'blue-dark': '#071E42',
          'blue-deeper': '#04152E',
          'blue-50': '#F4F7FB',
          'blue-100': '#E4EBF5',
          gold: '#C5A572',
          'gold-dark': '#A8894F',
          'gold-50': '#FBF7EF',
          seafoam: '#C5A572',
          'seafoam-dark': '#A8894F',
          'seafoam-50': '#FBF7EF',
        },
      },
      fontFamily: {
        display: ['Kanit', 'Prompt', 'sans-serif'],
        body: ['Prompt', 'Kanit', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
        card: '0 8px 24px rgba(15, 23, 42, 0.08)',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
};
