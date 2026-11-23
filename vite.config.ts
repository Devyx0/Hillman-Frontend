import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset URLs: the built app also works under a sub-path (e.g. GitHub Pages). Hash routing keeps routes client-side.
  base: './',
  plugins: [react(), tailwindcss()],
})
