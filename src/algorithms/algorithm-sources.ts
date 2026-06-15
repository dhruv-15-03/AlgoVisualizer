/**
 * Algorithm Python sources — loaded lazily, on purpose.
 *
 * Each algorithm's editable Python lives in `./python/<id>.py`. Those strings
 * are large (~114 KB combined) and are only ever rendered inside the Workspace
 * and Race routes, both of which are lazy-loaded. If a meta object imported its
 * source via a static `?raw` import, the string would be hoisted into whatever
 * chunk imports the registry — and since the Home page lists algorithms, that
 * meant every Python source shipped in the eager entry chunk the landing page
 * never uses.
 *
 * `import.meta.glob(..., { eager: true })` keeps the sources in a single module
 * that ONLY the lazy Workspace/Race chunks import, so the entry/Home graph never
 * pulls them. The getter stays synchronous, so consumers don't need loading
 * states or async plumbing.
 */

const sources = import.meta.glob('./python/*.py', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/**
 * Returns the default Python source for an algorithm by its `pythonFilename`
 * (e.g. `'kmeans.py'`). Throws if no source is registered so a typo surfaces
 * loudly in dev/tests rather than silently shipping an empty editor.
 */
export function getAlgorithmSource(pythonFilename: string): string {
  const src = sources[`./python/${pythonFilename}`];
  if (src === undefined) {
    throw new Error(`No Python source registered for "${pythonFilename}"`);
  }
  return src;
}
