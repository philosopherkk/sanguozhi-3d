import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages project site: https://<user>.github.io/sanguozhi-3d/
// Vercel serves at the domain root (VERCEL=1 during its build), so base must be '/'.
const isVercel = Boolean(process.env.VERCEL)

export default defineConfig({
  plugins: [react()],
  base: isVercel
    ? '/'
    : process.env.NODE_ENV === 'production'
      ? '/sanguozhi-3d/'
      : '/',
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 30,
            },
            {
              name: 'vendor-three',
              test: /[\\/]node_modules[\\/](three|@react-three|three-stdlib)[\\/]/,
              priority: 30,
            },
            {
              name: 'vendor-motion',
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              priority: 30,
            },
            {
              name: 'vendor-charts',
              test: /[\\/]node_modules[\\/]recharts[\\/]/,
              priority: 30,
            },
            {
              name: 'vendor-geo',
              test: /[\\/]node_modules[\\/]polygon-clipping[\\/]/,
              priority: 30,
            },
            {
              name: 'asia-war-territory',
              test: /[\\/]src[\\/]geo[\\/]asiaWarTerritory\.ts$/,
              priority: 20,
            },
            {
              name: 'zhou-early-data',
              test: /[\\/]src[\\/]zhou[\\/]data[\\/](earlyDynasty|earlyDynastyMore)\.ts$/,
              priority: 20,
            },
            {
              name: 'zhou-timeline-more',
              test: /[\\/]src[\\/]zhou[\\/]data[\\/](timelineMore|studentEvents|chengyuBridge)\.ts$/,
              priority: 20,
            },
          ],
        },
      },
    },
  },
  server: {
    proxy: {
      // Dev-only: bypass browser CORS for Grokipedia HTML fetch
      '/api/grok': {
        target: 'https://grokipedia.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/grok/, ''),
        secure: true,
      },
    },
  },
})
