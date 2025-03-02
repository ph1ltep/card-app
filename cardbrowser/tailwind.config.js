/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Scan all JS/JSX files in src/
  ],
  safelist: [
    'bg-blue-600', 'hover:bg-blue-700', // For Save button
    'bg-red-600', 'hover:bg-red-700',   // For Remove button
    'bg-green-600', 'hover:bg-green-700', // For Re-scan button
    'bg-gray-600', 'hover:bg-gray-700',  // For Close button
    'text-white', 'rounded-lg', 'px-4', 'py-2', 'transition-all', 'duration-200', 'shadow-sm' // Common styles
  ],
  theme: {
    extend: {
      boxShadow: {
        'xl': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        'xl': '1rem',
      },
    },
  },
  plugins: [],
};