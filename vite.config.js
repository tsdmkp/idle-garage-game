import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // base: '/idle-garage-game/', // <-- УБИРАЕМ или комментируем эту строку для Vercel

  server: {
    port: 5173,
    open: true,
    // proxy неТо нужен, если обращаемся к бэкенду по полному URL
  },

  build: {
    outDir: 'dist',
  }
})