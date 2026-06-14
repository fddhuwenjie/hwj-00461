/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: { DEFAULT: '#FF6B35', dark: '#E55A25', light: '#FF8F66' },
        brown: { DEFAULT: '#3E2723', light: '#5D4037', lighter: '#8D6E63' },
        cream: '#FFF8F0',
        success: '#4CAF50',
        danger: '#E53935',
        amber: '#FFB300',
      },
      borderRadius: {
        card: '8px',
        btn: '6px',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', '"Noto Sans"', 'Helvetica', 'Arial', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"'],
      },
    },
  },
  plugins: [],
};
