import { type Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

export default {
  content: ["./src/**/*.tsx"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", ...fontFamily.sans],
      },
      keyframes: {
        'sparkle-twinkle': {
          '0%': { 
            transform: 'scale(0) rotate(0deg)',
            opacity: '0'
          },
          '20%': {
            transform: 'scale(1) rotate(180deg)',
            opacity: '0.8'
          },
          '35%': {
            transform: 'scale(0.8) rotate(270deg)',
            opacity: '0.4'
          },
          '50%': {
            transform: 'scale(1.2) rotate(360deg)',
            opacity: '0.9'
          },
          '65%': {
            transform: 'scale(0.9) rotate(450deg)',
            opacity: '0.5'
          },
          '80%': {
            transform: 'scale(1) rotate(540deg)',
            opacity: '0.8'
          },
          '100%': { 
            transform: 'scale(0) rotate(720deg)',
            opacity: '0'
          }
        }
      },
      animation: {
        'sparkle-twinkle': 'sparkle-twinkle var(--duration, 2000ms) ease-out forwards'
      }
    },
  },
  plugins: [],
} satisfies Config;
