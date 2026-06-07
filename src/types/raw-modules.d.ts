/**
 * Ambient module declarations for Vite's `?raw` imports.
 *
 * Allows `import src from './kmeans.py?raw'` to type-check as `string`.
 */

declare module '*.py?raw' {
  const content: string;
  export default content;
}

declare module '*?raw' {
  const content: string;
  export default content;
}
