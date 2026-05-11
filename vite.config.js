import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 4000,
    host: true, // listen on 0.0.0.0 so the container port is reachable
    proxy: {
      '/api': {
        // In Docker: BACKEND_TARGET=http://backend:3000 (set in docker-compose.yml)
        // Locally: falls back to http://localhost:3000
        target: process.env.BACKEND_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
