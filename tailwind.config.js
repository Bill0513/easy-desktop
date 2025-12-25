/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#fdfbf7',
        pencil: '#2d2d2d',
        muted: '#e5e0d8',
        accent: '#ff4d4d',
        bluePen: '#2d5da1',
        postit: '#fff9c4',
      },
      fontFamily: {
        marker: ['Kalam', 'cursive'],
        handwritten: ['Patrick Hand', 'cursive'],
      },
      boxShadow: {
        hard: '4px 4px 0px 0px #2d2d2d',
        'hard-lg': '8px 8px 0px 0px #2d2d2d',
        'hard-sm': '2px 2px 0px 0px #2d2d2d',
      },
      animation: {
        'bounce-slow': 'bounce 3s infinite',
        'wiggle': 'wiggle 0.5s ease-in-out infinite',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-1deg)' },
          '50%': { transform: 'rotate(1deg)' },
        },
      },
    },
  },
  plugins: [],
}
