//vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const config = {
    plugins: [react()],
    base: command === 'serve' ? '/' : '/schoolmanagementwebapp/', // Different base for dev vs build
  }
  
  return config
})