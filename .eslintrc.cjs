module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'node_modules', 'wireframe.html'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      // Build/test tooling configs and Playwright e2e run in Node, not the browser.
      files: [
        '*.config.ts',
        'vite.config.ts',
        'vitest.config.ts',
        'playwright.config.ts',
        'e2e/**/*.ts',
      ],
      env: { node: true, browser: true },
    },
  ],
};
