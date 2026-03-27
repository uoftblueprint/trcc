import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-manrope)", "sans-serif"],
      },
      colors: {
        "primary-purple": "var(--color-primary-purple)",
        "secondary-purple": "var(--color-secondary-purple)",
        "accent-purple": "var(--color-accent-purple)",
        "dark-accent-purple": "var(--color-dark-accent-purple)",
        "trcc-purple": "var(--trcc-purple)",
        "trcc-light-purple": "var(--trcc-light-purple)",
      },
    },
  },
  plugins: [],
};

export default config;
