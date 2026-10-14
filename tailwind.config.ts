import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ios: {
          bg: '#F5F5F7',
          ink: '#1D1D1F',
          sub: '#6E6E73',
          blue: '#0071E3',
          blueHover: '#0077ED',
          red: '#FF3B30',
          green: '#34C759',
          orange: '#FF9500',
        },
      },
      borderRadius: {
        '4xl': '2rem',
      },
      fontFamily: {
        sans: ['var(--font-arabic)', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
