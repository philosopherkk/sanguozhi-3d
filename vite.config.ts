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
