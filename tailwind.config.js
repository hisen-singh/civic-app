/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./screens/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        civic: {
          primary: '#1E3A8A', // Trust blue
          accent: '#FF6B35', // Action orange
          success: '#10B981', // Growth green
          light: '#F5F7FA',
        },
      },
    },
  },
  plugins: [],
};
