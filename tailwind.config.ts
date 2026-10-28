import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slide-in 0.4s ease-out',
        'jump-attn': 'jump-attn 0.7s ease-in-out',
        'tooltip-pop': 'tooltip-pop 0.25s ease-out',
      },
      keyframes: {
        'slide-in': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'jump-attn': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '30%':      { transform: 'translateY(-8px) scale(1.18)' },
          '60%':      { transform: 'translateY(2px)  scale(0.98)' },
          '80%':      { transform: 'translateY(0)    scale(1.05)' },
        },
        'tooltip-pop': {
          '0%':   { transform: 'translate(-50%, -2px) scale(0.8)', opacity: '0' },
          '100%': { transform: 'translate(-50%, -8px) scale(1)',   opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
