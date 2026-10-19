import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages project site: https://<user>.github.io/sanguozhi-3d/
export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/sanguozhi-3d/' : '/',
})
