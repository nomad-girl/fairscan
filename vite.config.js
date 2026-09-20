import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';

// La versión visible en Configuración (20/09): commit corto y fecha de compilación, para saber qué corre cada teléfono.
const VERSION_APP = (() => { try { return execSync('git rev-parse --short HEAD').toString().trim(); } catch { return 'dev'; } })() + ' · ' + new Date().toISOString().slice(0, 16).replace('T', ' ');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // En el build nativo (Capacitor) el service worker no se genera: el propio
  // empaquetado ya deja los archivos en el teléfono, y tener dos capas de caché
  // provoca recargas raras en medio de una captura. Ver src/lib/platform.js
  const nativeBuild = env.VITE_NATIVE === '1';

  return {
    define: { __APP_VERSION__: JSON.stringify(VERSION_APP) },
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
        disable: nativeBuild,
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
          // Las páginas legales (/privacidad, /terminos, /soporte) son HTML estático:
          // el service worker no las tiene que reemplazar por la app.
          navigateFallbackDenylist: [/^\/api\//, /^\/.netlify\//, /^\/(privacidad|terminos|soporte)(\/|$)/],
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
            // Fotos en R2: NUNCA por el caché del service worker (15/09/2026).
            // Antes era CacheFirst con 500 entradas y en el iPhone de Nati fallaban
            // 149 de 149 fotos mientras la misma dirección abierta a mano cargaba.
            // Causa: una foto de otro dominio llega como respuesta "opaca" y el
            // navegador la anota en la cuota del caché como ~7 MB aunque pese 160 KB;
            // en iOS la cuota se llena a las pocas decenas y desde ahí cada pedido
            // de foto falla en vez de pasar de largo. El caché HTTP normal del
            // navegador ya las guarda solo, sin ese castigo.
            {
              urlPattern: /^https:\/\/(.*\.(r2\.dev|cloudflare)|fotos\.fairscan\.app).*\.(jpg|jpeg|png|webp)/i, // las fotos nunca pasan por el caché del SW (15/09)
              handler: 'NetworkOnly',
            },
            // (Las reglas para Google Fonts se fueron: DM Sans viaja dentro del
            // paquete desde la pieza 1.13 y entra en la precache como woff2.)
          ],
        },
      }),
    ],
  };
});
