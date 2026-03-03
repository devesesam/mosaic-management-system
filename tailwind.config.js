/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary Backgrounds
        'garlic': '#F9F8F1',        // warm off-white for light backgrounds
        'aubergine': '#3A4750',     // dark charcoal-blue for navbar/dark backgrounds

        // Accents
        'margaux': '#477296',       // dusty blue accent for focus states, links
        'saffron': '#B96129',       // burnt orange accent for CTAs

        // Secondary Palette
        'blueberry': '#345981',     // deep blue for primary buttons
        'vanilla': '#F7F4E9',       // creamy neutral for panels
        'charcoal': '#333333',      // dark text
        'seafoam': '#94B0B3',       // grey-leaning teal for highlights
        'cinnamon': '#A65628',      // earthy reddish-brown
        'sorbet': '#E2C1A4',        // pale warm peach for drop zones
      },
      fontFamily: {
        'bogart': ['Bogart', 'Georgia', 'serif'],
        'body': ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
