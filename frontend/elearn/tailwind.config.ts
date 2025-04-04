import type { Config } from "tailwindcss";


const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      animation: {
        spin: 'spin 1s linear infinite',
      },
      perspective: {
        1000: "1000px",
      },
      rotate: {
        "y-180": "rotateY(180deg)",
      },
    },
    fontFamily: {
      quran: ['Amiri Quran', 'serif'], // Replace with your font
    },
    colors: {
      'black':"#000",
      'white':"#fff",
      'blue': '#1fb6ff',
      'orange': '#ff7849',
      'green': '#97c680',
      'red-300':'#fca5a5',
      'red-500':'#ef4444',
      'red-800':'#991b1b',
      'yellow': '#ffc82c',
      'yellow-800': '#894b00',

      'gray-dark': '#273444',
      'gray': '#8492a6',
      'gray-700': '#374151',
      'gray-800': '#1e293b',
      'gray-300':'#d1d5db',  
      'gray-light':'#d3dce6',
      'lime-500':'#84cc16',
      'blue-400':'#38bdf8',
      'blue-500':'#0ea5e9',
      'blue-300':'#93c5fd',
      'blue-200':'#bfdbfe',
      "yellow-400":"#facc15",
      "yellow-300":"#fde047",
      "yellow-200":"#fef08a",
      "green-400":"#4ade80",
      "green-300":"#86efac",
      "green-200":"#bbf7d0",
      "green-800":"#166534",
      "sky-400":"#38bdf8",
      "emerald-500":"#10b981",
      "purple-600":"#9333ea",
      "stone-50":"#fafaf9",
      "purple":"#7e5bef",
      "purple-800":"#6b21a8",
      "pink-800":"#9d174d",
      "golden":'#a67c00'
    },
  },
  variants: {
    extend: {
      scale: ['hover'],
      transform: ['hover'],
    },
  },
  plugins: [require('tailwindcss-rtl'),],
};
export default config;
