import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()], 
  base: process.env.VITE_BASE_PATH || "/",
  // Dev proxy: forward API calls to backend server during local development
  server: {
    proxy: {
      '/api': {
        target: process.env.DEV_API_URL || 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  assetsInclude: ['**/*.glb', '**/*.usdz'],
})
