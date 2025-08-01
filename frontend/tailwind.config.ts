import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities }) {
      const newUtilities = {
        '.text-stroke': {
          '-webkit-text-stroke': '1px white',
        },
        '.text-stroke-2': {
          '-webkit-text-stroke': '2px white',
        },
        '.text-stroke-black': {
          '-webkit-text-stroke': '1px black',
        },
        '.text-stroke-purple': {
          '-webkit-text-stroke': '1px #a855f7',
        },
      };
      addUtilities(newUtilities);
    }),
  ],
};

export default config; 