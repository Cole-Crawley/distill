import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    VitePWA({
      // 'injectManifest' hands control of the service worker to our own
      // src/sw.ts (see that file) instead of letting the plugin generate one
      // from config alone — needed because a proper offline-fallback-page
      // chain (try network → fall back to cached shell → fall back to a
      // dedicated offline.html) isn't expressible through generateSW's
      // options.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // Defers registerSW.js instead of a plain blocking <script> tag —
      // found render-blocking (302ms) in the O4 Lighthouse audit, and SW
      // registration has no reason to hold up the initial page paint.
      injectRegister: 'script-defer',
      injectManifest: {
        // offline.html isn't imported/referenced anywhere in the app's own
        // code, so Vite's build wouldn't otherwise know to include it in
        // the precache manifest sw.ts builds from — this adds it explicitly.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'offline.html'],
      manifest: {
        name: 'Distill',
        short_name: 'Distill',
        description: 'AI-powered spaced repetition for anything you read or watch',
        theme_color: '#faf9f6',
        background_color: '#faf9f6',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // Lets the service worker register during `npm run dev` too, not just
      // in a production build — otherwise offline behaviour could only ever
      // be checked after a full build + preview.
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
})
