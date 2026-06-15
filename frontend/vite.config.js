import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    base: process.env.VITE_APP_BASE || (process.env.GITHUB_ACTIONS ? '/vanta/' : '/'),
    plugins: [react()],
    server: {
      port: 5173,
      open: true
    }
  }
})
