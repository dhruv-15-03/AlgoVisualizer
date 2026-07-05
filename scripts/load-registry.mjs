/**
 * Bundles the live algorithm registry + category labels with esbuild and imports
 * the result, so build scripts (prerender, OG image generation) read the exact
 * same data the app ships and never drift from it.
 *
 * Shared by `prerender.mjs` and `generate-og-images.mjs`.
 */

import { writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import * as esbuild from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const srcDir = resolve(root, 'src');

/** Bundle the registry + category labels with esbuild and import the result. */
export async function loadRegistry() {
  const result = await esbuild.build({
    stdin: {
      contents:
        "export { listAlgorithms } from '@/algorithms/registry';\n" +
        "export { CATEGORY_LABELS } from '@/types/algorithm';\n",
      resolveDir: root,
      loader: 'ts',
    },
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    logLevel: 'silent',
    alias: { '@': srcDir },
  });

  const tmpFile = join(tmpdir(), `av-registry-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`);
  writeFileSync(tmpFile, result.outputFiles[0].text, 'utf8');
  try {
    return await import(pathToFileURL(tmpFile).href);
  } finally {
    rmSync(tmpFile, { force: true });
  }
}
