/** @type {import('tailwindcss').Config} */
export default {
  content: ["./react/src/waterfall/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      gridTemplateColumns: {
        subgrid: "subgrid",
      },
      gridTemplateRows: {
        subgrid: "subgrid",
      },
    },
  },
  plugins: [],
}
