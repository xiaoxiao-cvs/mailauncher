/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    "./src/assets/**/*.css",
  ],
  theme: {
    extend: {
      colors: {
        // 扩展颜色系统以更好地适应daisyui主题
        "primary-light": "var(--primary-light)",
        "primary-dark": "var(--primary-dark)",
        "chart-line": "var(--chart-line)",
        "chart-secondary": "var(--chart-secondary)",
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: true, // 启用所有主题
    darkTheme: "dark",
    base: true,
    styled: true,
    utils: true,
    logs: false,
  },
};
