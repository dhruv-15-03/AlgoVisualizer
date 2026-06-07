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
    // Monaco alone is ~600 KB; the warning is informational, not actionable
    // unless we want to ship a different editor.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Split heavy vendor libs into their own chunks so a typical code
        // change doesn't bust Monaco / D3 / framer's long-lived caches. The
        // initial Home payload only needs react-vendor; everything else is
        // pulled lazily by routes that need it.
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return;
          if (id.includes('monaco-editor') || id.includes('@monaco-editor')) return 'monaco';
          if (id.includes('recharts') || id.includes('/d3-') || id.includes('node_modules/d3/')) return 'charts';
          if (id.includes('katex') || id.includes('react-katex')) return 'math';
          if (id.includes('react-router')) return 'router';
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('scheduler')) return 'react-vendor';
          return;
        },
      },
    },
  },
});
