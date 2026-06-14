/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Vitest reuses Vite's transform pipeline, so the `@/` alias and `?raw`
// imports used by the algorithm registry work the same as in the app build.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // The PWA plugin isn't in the Vitest pipeline, so the build-time virtual
      // module has no implementation here. Point it at a safe stub so imports
      // resolve; tests that exercise the prompt override it with `vi.mock`.
      'virtual:pwa-register/react': path.resolve(
        __dirname,
        './src/test/pwa-register-react-stub.ts',
      ),
    },
  },
  test: {
    globals: false,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Unit tests only. Playwright e2e specs live in ./e2e and use `.spec.ts`.
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'e2e'],
  },
});
