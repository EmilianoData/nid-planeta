import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        delp: {
          navy: '#0A1628',
          deep: '#050B16',
          mid: '#122942',
          orange: '#FF6B1A',
          orangeSoft: '#FFA366',
          cyan: '#21D4FD',
          green: '#00E5A0',
          yellow: '#FFD233',
          red: '#FF3D5A',
          purple: '#B14AED',
          white: '#F2F7FC',
          gray: '#8A9BB0',
        },
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        body: ['Barlow', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
