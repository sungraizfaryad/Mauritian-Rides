/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        basalt: { 950: '#0a0f14', 900: '#0f1720', 800: '#182330', 700: '#243243' },
        ink:    { 600: '#4a5a6e', 400: '#7d8ea3', 300: '#a8b5c4' },
        sand:   { 50: '#faf6ee', 100: '#f4ecd8', 200: '#e9dcb8' },
        lagoon: { 900: '#0a4843', 600: '#089890', 500: '#0bb8ad', 400: '#2cd4c4', 200: '#9ee8e0' },
        coral:  { 600: '#ee5a30', 500: '#ff7a54', 300: '#ffc0a0' },
        sunset: { 500: '#f89428', 400: '#ffb24a' },
        reef:   { 500: '#e0395e' },
        surface: '#ffffff',
        surfaceDim: '#faf6ee',
        danger: '#e0395e',
      },
      fontFamily: {
        display: ['Fraunces_400Regular', 'Fraunces_400Regular_Italic', 'serif'],
        sans:    ['Manrope_400Regular', 'Manrope_600SemiBold', 'System'],
        mono:    ['JetBrainsMono_400Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        'r-xs': '8px',
        'r-sm': '10px',
        'r-md': '16px',
        'r-lg': '24px',
        'r-xl': '32px',
        'r-2xl': '44px',
        pill: '999px',
      },
    },
  },
  plugins: [],
};
