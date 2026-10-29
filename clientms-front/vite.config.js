import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxy = {
    target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000',
    changeOrigin: false,
  }
  return {
    plugins: [react()],
    server: {
      host: 'localhost',
      port: 5173,
      strictPort: true,
      proxy: { '/api': proxy, '/sanctum': proxy, '/auth/google': proxy },
    },
  }
})
