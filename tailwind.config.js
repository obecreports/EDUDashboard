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
          blue: '#29568f',
          'blue-dark': '#1e4070',
          'blue-deeper': '#163456',
          'blue-50': '#eef3f9',
          'blue-100': '#d6e3f0',
          seafoam: '#00c6a0',
          'seafoam-dark': '#00a886',
          'seafoam-50': '#e6faf5',
        },
      },
      fontFamily: {
        display: ['Kanit', 'Prompt', 'sans-serif'],
        body: ['Prompt', 'Kanit', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 8px rgba(41, 86, 143, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
        card: '0 6px 16px rgba(41, 86, 143, 0.08), 0 2px 6px rgba(15, 23, 42, 0.04)',
      },
    },
  },
  plugins: [],
};
