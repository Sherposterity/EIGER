import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      // The app, plus the standalone emergency contact page for the check-in
      // timer (/contact-confirm, src/lib/contactConsent.js). That page is plain
      // HTML and a small module: no React, no app shell, nothing that could
      // record its one-time token.
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        contactConfirm: fileURLToPath(new URL('./contact-confirm/index.html', import.meta.url)),
      },
    },
  },
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
