import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      // shadcn components import { cn } from "cn"; route that to our configured
      // instance so it understands the custom type tokens. Exact match only,
      // so "cn/config" inside src/lib/utils.js still reaches the package.
      { find: /^cn$/, replacement: fileURLToPath(new URL('./src/lib/utils.js', import.meta.url)) },
    ],
  },
})
