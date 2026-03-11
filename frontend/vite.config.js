import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// FIX: Removed unused /api proxy — requests go directly to VITE_API_URL.
// The proxy was never triggered since api.js uses the full BASE URL.

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Only needed if you want to run frontend+backend on same origin in dev.
    // With CORS configured on backend, direct requests work fine.
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          router: ['react-router-dom'],
        },
      },
    },
  },
})
