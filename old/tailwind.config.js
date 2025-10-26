/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'glass': 'rgba(255, 255, 255, 0.8)',
        'glass-border': 'rgba(255, 255, 255, 0.2)',
      },
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
        '3xl': '32px',
      },
      boxShadow: {
        'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'medium': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'large': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'glow': '0 0 20px rgba(66, 153, 225, 0.3)',
        'glow-lg': '0 0 30px rgba(66, 153, 225, 0.4)',
      },
      animation: {
        'badge-glow': 'badge-glow 2s ease-in-out infinite',
        'skeleton-wave': 'skeleton-wave 1.5s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        'badge-glow': {
          '0%, 100%': {
            'box-shadow': '0 0 5px rgba(16, 185, 129, 0.3)',
          },
          '50%': {
            'box-shadow': '0 0 15px rgba(16, 185, 129, 0.6)',
          },
        },
        'skeleton-wave': {
          '0%': {
            'background-position': '-200% 0',
          },
          '100%': {
            'background-position': '200% 0',
          },
        },
        'float': {
          '0%, 100%': {
            transform: 'translateY(0px)',
          },
          '50%': {
            transform: 'translateY(-4px)',
          },
        },
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        light: {
          "primary": "#3b82f6",
          "primary-focus": "#2563eb",
          "primary-content": "#1e3a8a",
          "secondary": "#06b6d4",
          "secondary-focus": "#0891b2",
          "secondary-content": "#155e75",
          "accent": "#f59e0b",
          "accent-focus": "#d97706",
          "accent-content": "#92400e",
          "neutral": "#f8fafc",
          "neutral-focus": "#f1f5f9",
          "neutral-content": "#334155",
          "base-100": "#ffffff",
          "base-200": "#f9fafb",
          "base-300": "#f3f4f6",
          "base-content": "#1f2937",
          "info": "#3b82f6",
          "info-content": "#1e3a8a",
          "success": "#10b981",
          "success-content": "#155e75",
          "warning": "#f59e0b",
          "warning-content": "#92400e",
          "error": "#ef4444",
          "error-content": "#b91c1c",
        },
      },
      "dark"
    ],
    darkTheme: "dark",
  },
};
