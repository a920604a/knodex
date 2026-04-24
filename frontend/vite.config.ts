import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    base: env.VITE_BASE_PATH || process.env.VITE_BASE_PATH || '/',
    server: {
      port: 5173,
      strictPort: true,
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
      proxy: {
        '^/(auth|query|document-tags|documents|highlights|tags|search|health)': {
          target: process.env.BACKEND_URL ?? 'http://localhost:18000',
          changeOrigin: true,
          bypass(req) {
            // Browser page navigation sends Accept: text/html — let Vite serve index.html
            if (req.headers.accept?.includes('text/html')) return req.url;
          },
        },
      },
    },
  }
})
