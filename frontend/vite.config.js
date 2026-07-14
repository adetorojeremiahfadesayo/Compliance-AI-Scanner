import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'

// Proxy target for the FastAPI backend during local dev.
const BACKEND = process.env.VITE_DEV_BACKEND || 'http://localhost:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
      '/ws': { target: BACKEND, ws: true, changeOrigin: true },
    },
  },
})
