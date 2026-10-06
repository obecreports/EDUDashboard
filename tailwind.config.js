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
          blue: '#0B4DA2',
          'blue-dark': '#1E40AF',
          'blue-deeper': '#0F2F6B',
          'blue-50': '#EFF6FF',
          'blue-100': '#DBEAFE',
          seafoam: '#0D9488',
          'seafoam-dark': '#0F766E',
          'seafoam-50': '#F0FDFA',
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
