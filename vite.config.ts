import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt' (not 'autoUpdate'): a new deploy installs in the background but
      // never silently takes over the open tab. The app holds expensive,
      // destroyable state (a ~10 MB warm Pyodide runtime, in-progress training
      // runs, edited Monaco code), so we surface the waiting update as a
      // dismissible toast (src/components/UpdatePrompt.tsx) and only reload on an
      // explicit user click. skipWaiting/clientsClaim below still let that
      // user-triggered reload activate the new SW immediately.
      registerType: 'prompt',
      injectRegister: 'auto',
      // Disable in dev so the SW never interferes with Vite HMR / module
      // graph. `npm run dev` behaves exactly as before.
      devOptions: { enabled: false },
      includeAssets: ['favicon.svg', 'robots.txt'],
      manifest: {
        name: 'AlgoVisualizer · ML algorithms, demystified',
        short_name: 'AlgoVisualizer',
        description:
          'Edit real Python in your browser and watch ML algorithms train step by step on real datasets.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        categories: ['education', 'productivity', 'developer'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache the app shell. The big Pyodide/runtime payloads are
        // runtime-cached below, not precached, so installs stay light.
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/icons\//, /^\/assets\//, /\.(?:png|xml|txt|webmanifest)$/],
        cleanupOutdatedCaches: true,
        // clientsClaim (take control of open pages) is fine and helps first-load
        // offline. skipWaiting MUST be false for the 'prompt' flow: a new SW has
        // to stay in the waiting state so workbox-window fires `onNeedRefresh`
        // (→ our UpdatePrompt toast). Clicking Reload posts SKIP_WAITING via
        // updateServiceWorker(true), which activates the waiting SW and reloads.
        // With skipWaiting:true the new SW would self-activate on install and the
        // prompt would never appear.
        clientsClaim: true,
        skipWaiting: false,
        runtimeCaching: [
          {
            // Pyodide CPython WASM + numpy/package files (~10 MB on first
            // visit). CacheFirst means every later visit — and the Web Worker
            // that loads Pyodide — is served from cache: near-instant cold
            // start and offline-capable. Requests originate from the worker
            // but are intercepted by the page's controlling service worker.
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/pyodide\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pyodide-runtime-v0.26.2',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
              rangeRequests: true,
            },
          },
          {
            // Google Fonts stylesheet — refreshes in the background.
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts files (Material Symbols) — long-lived, immutable.
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: false,
    // NOTE: COOP/COEP would enable SharedArrayBuffer (lets us interrupt
    // Pyodide mid-step), but it also blocks CDN resources without CORP
    // headers. We use cooperative cancellation between yields instead, so we
    // keep the simpler setup until we genuinely need SAB.
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['pyodide'],
  },
  build: {
    target: 'es2022',
    // Monaco alone is ~600 KB; the warning is informational, not actionable
    // unless we want to ship a different editor.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Split heavy vendor libs into their own chunks so a typical code
        // change doesn't bust Monaco / D3's long-lived caches. The initial
        // Home payload only needs react-vendor; everything else is pulled
        // lazily by routes that need it.
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return;
          if (id.includes('monaco-editor') || id.includes('@monaco-editor')) return 'monaco';
          if (id.includes('/d3-') || id.includes('node_modules/d3/')) return 'charts';
          if (id.includes('katex') || id.includes('react-katex')) return 'math';
          if (id.includes('react-router')) return 'router';
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('scheduler')) return 'react-vendor';
          return;
        },
      },
    },
  },
});
