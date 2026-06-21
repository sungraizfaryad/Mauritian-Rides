/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        basalt: {
          900: '#1a1a1a',
          700: '#333333',
          500: '#666666',
          300: '#999999',
        },
        lagoon: {
          700: '#0077b6',
          500: '#00b4d8',
          300: '#90e0ef',
          100: '#caf0f8',
        },
        amber: { 500: '#f59e0b' },
        mur: '#1a6b3f',
        danger: '#ef4444',
        surface: '#ffffff',
        surfaceDim: '#f5f5f5',
      },
      fontFamily: {
        // Placeholder — replace with real expo-font family names when brand fonts land.
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
