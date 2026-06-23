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
          orange: '#FF6B1A',          // glow primary
          orangeSoft: '#FFA366',
          orangeAccent: '#DD8F1A',    // NID accent (matte)
          orangeText: '#FFB45A',      // text accent
          cyan: '#21D4FD',
          green: '#00E5A0',
          yellow: '#FFD233',
          red: '#FF3D5A',
          purple: '#B14AED',          // rim-light purple
          white: '#F2F7FC',
          gray: '#8A9BB0',
        },
        nid: {
          purple: '#3C3489',
          purpleSoft: '#534AB7',
          bgDeep: '#0A0612',
        },
        crew: {
          tech: '#21D4FD',
          rpa: '#A89BF0',
          host: '#DD8F1A',
          bi: '#38E0A0',
          po: '#FF6B9D',
          devsec: '#FFB45A',
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
