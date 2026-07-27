/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#ff6e30",
          hover: "#e0561b",
          active: "#c5430f",
          light: "rgba(255, 110, 48, 0.08)",
        },
        stone: {
          50: "#fafaf9",
          100: "#f5f5f4",
          150: "#eeeeed",
          200: "#e7e5e4",
          300: "#d6d3d1",
          400: "#a8a29e",
          500: "#78716c",
          600: "#57534e",
          700: "#44403c",
          800: "#292524",
          900: "#1c1917",
        }
      },
    },
  },
  plugins: [],
};
