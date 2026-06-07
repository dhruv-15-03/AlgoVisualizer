import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
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
  },
});
