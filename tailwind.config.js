/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7EC8E3',
          50: '#F0F9FD',
          100: '#D6EFF8',
          200: '#ADDFF1',
          300: '#7EC8E3',
          400: '#4FB3D5',
          500: '#2A9EC7',
          600: '#1F80A3',
          700: '#1A6480',
          800: '#154F63',
          900: '#0F3A47',
        },
        accent: {
          DEFAULT: '#F8BBD0',
          50: '#FFF5F8',
          100: '#FDE8F0',
          200: '#FBD1E1',
          300: '#F8BBD0',
          400: '#F590B5',
          500: '#F2659A',
          600: '#E83A7F',
          700: '#C4205F',
          800: '#9A1848',
          900: '#711130',
        },
      },
      borderRadius: {
        DEFAULT: '16px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.08)',
        'card-hover': '0 4px 20px rgba(0,0,0,0.12)',
      },
      spacing: {
        '4': '16px',
      },
    },
  },
  plugins: [],
};
