/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        light: {
          primary: "#4a7eff",
          secondary: "#42b983",
          accent: "#e6a23c",
          neutral: "#f0f5ff",
          "base-100": "#ffffff",
          info: "#3abff8",
          success: "#67c23a",
          warning: "#e6a23c",
          error: "#f56c6c",
        },
        dark: {
          primary: "#5983ff",
          secondary: "#50c894",
          accent: "#e6b354",
          neutral: "#1a1a1a",
          "base-100": "#1d1d1d",
          info: "#3abff8",
          success: "#85ce61",
          warning: "#e6b954",
          error: "#f78989",
        },
      },
    ],
    darkTheme: "dark",
  },
};
