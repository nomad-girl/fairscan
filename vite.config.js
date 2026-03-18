import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'FairScan',
        short_name: 'FairScan',
        description: 'Captura y organiza productos en ferias comerciales',
        theme_color: '#0A0E17',
        background_color: '#0A0E17',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'es',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Don't cache API or Supabase calls in precache
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/.netlify\//],
        runtimeCaching: [
          // API calls (Netlify functions) - always hit network first
          {
            urlPattern: /^https:\/\/.*\/(api|\.netlify\/functions)\/.*/i,
            handler: 'NetworkOnly',
          },
          // Supabase API calls - always network
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
          },
          // R2 / Cloudflare photo URLs - cache with network fallback
          {
            urlPattern: /^https:\/\/.*\.(r2\.dev|cloudflare).*\.(jpg|jpeg|png|webp)/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'product-photos-cache',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          // Google Fonts
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
});
