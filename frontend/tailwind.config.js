/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        tv: {
          bg:        '#131722',
          surface:   '#1e222d',
          border:    '#2a2e39',
          text:      '#d1d4dc',
          muted:     '#787b86',
          blue:      '#2962ff',
          'blue-h':  '#1a54e8',
          green:     '#26a69a',
          red:       '#ef5350',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Trebuchet MS', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
