/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'mocha-surface': 'var(--mocha-surface)',
        'mocha-surface-1': 'var(--mocha-surface-1)',
        'mocha-text': 'var(--mocha-text)',
        'mocha-subtext0': 'var(--mocha-subtext0)',
        'mocha-blue': 'var(--mocha-blue)',
        'mocha-flamingo': 'var(--mocha-flamingo)',
        'mocha-yellow': 'var(--mocha-yellow)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate")
  ],
} 