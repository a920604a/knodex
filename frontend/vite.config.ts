import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // VITE_BASE_PATH 由 CI 注入，本地開發維持 '/'
  base: process.env.VITE_BASE_PATH || '/',
})
