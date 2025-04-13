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
        'black': '#000',
        'white': '#fff',
        
        // Blue Family
        'blue': '#1fb6ff',
        'blue-200': '#bfdbfe',
        'blue-300': '#93c5fd',
        'blue-400': '#38bdf8',
        'blue-500': '#0ea5e9',
        'blue-600': '#155dfc',
        'blue-700': '#1447e6',
        
        // Gray Family
        'gray': '#8492a6',
        'gray-dark': '#273444',
        'gray-light': '#d3dce6',
        'gray-50': '#FAFAFA',
        'gray-100': '#F3F4F6',
        'gray-200': '#E5E7EB',
        'gray-300': '#d1d5db',
        'gray-400': '#9CA3AF',
        'gray-500': '#6B7280',
        'gray-600': '#4B5563',
        'gray-700': '#374151',
        'gray-800': '#1e293b',
        
        // Green Family
        'green': '#97c680',
        'green-200': '#bbf7d0',
        'green-300': '#86efac',
        'green-400': '#4ade80',
        'green-500': '#00c951',
        
        'green-800': '#166534',
        
        // Red Family
        'red-300': '#fca5a5',
        'red-500': '#ef4444',
        'red-800': '#991b1b',
        
        // Yellow Family
        'yellow': '#ffc82c',
        'yellow-200': '#fef08a',
        'yellow-300': '#fde047',
        'yellow-400': '#facc15',
        'yellow-800': '#894b00',
        
        // Emerald Family
        'emerald-100': '#D1FAE5',
        'emerald-200': '#A7F3D0',
        'emerald-500': '#10b981',
        'emerald-600': '#059669',
        
        // Purple Family
        'purple': '#7e5bef',
        'purple-600': '#9333ea',
        'purple-800': '#6b21a8',
        
        // Additional Colors
        'orange': '#ff7849',
        'lime-500': '#84cc16',
        'sky-400': '#38bdf8',
        'pink-800': '#9d174d',
        'golden': '#a67c00',
        'stone-50': '#fafaf9',
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
