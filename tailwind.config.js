/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 主题变量（通过 CSS 变量动态切换）
        paper: 'var(--color-bg-primary)',
        pencil: 'var(--color-text-primary)',
        muted: 'var(--color-muted)',
        accent: '#ff4d4d',
        bluePen: '#2d5da1',
        postit: '#fff9c4',
        // 新增主题相关颜色变量
        'bg-primary': 'var(--color-bg-primary)',
        'bg-secondary': 'var(--color-bg-secondary)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'border-primary': 'var(--color-border-primary)',
      },
      fontFamily: {
        marker: ['Kalam', 'cursive'],
        handwritten: ['Patrick Hand', 'cursive'],
      },
      boxShadow: {
        hard: '4px 4px 0px 0px var(--color-shadow-primary)',
        'hard-lg': '8px 8px 0px 0px var(--color-shadow-primary)',
        'hard-sm': '2px 2px 0px 0px var(--color-shadow-primary)',
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
