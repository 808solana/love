import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite serves the UI on :3000 and proxies /api to the Express server on :3001,
// so the OpenRouter key stays server-side and never reaches the browser.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
