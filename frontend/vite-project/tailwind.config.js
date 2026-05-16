/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#00f5ff",
        secondary: "#8b5cf6",
        dark: "#050816",
      },
      boxShadow: {
        neon: "0 0 20px #00f5ff",
      },
    },
  },
  plugins: [],
}