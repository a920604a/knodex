import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '^/(documents|highlights|tags|search|health)': {
        target: process.env.BACKEND_URL ?? 'http://localhost:18000',
        changeOrigin: true,
      },
    },
  },
})
