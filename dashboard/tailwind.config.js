/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        surface: {
          0: '#08080c',
          1: '#0d0d14',
          2: '#111118',
          3: '#1a1a24',
          4: '#2a2a3a',
        },
        accent: {
          DEFAULT: '#7c3aed',
          light: '#c084fc',
        },
      },
    },
  },
  plugins: [],
};
