// @ts-nocheck
/**
 * Generate PWA icons and the OG social card from the brand SVG sources in
 * scripts/assets/ into public/.
 *
 * This is a one-off asset-generation step; the produced PNGs are committed,
 * so `sharp` is NOT a runtime/CI dependency. To regenerate:
 *
 *   npm i -D sharp && node scripts/generate-assets.mjs && npm uninstall sharp
 *
 * Outputs:
 *   public/icons/icon-192.png            (any)
 *   public/icons/icon-512.png            (any)
 *   public/icons/icon-maskable-512.png   (maskable, full-bleed safe zone)
 *   public/icons/apple-touch-icon.png    (180, any)
 *   public/og-image.png                  (1200x630 social card)
 */
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = (name) => readFileSync(resolve(here, 'assets', name));
const out = (name) => resolve(here, '..', 'public', name);

const icon = src('icon.svg');
const maskable = src('icon-maskable.svg');
const og = src('og-image.svg');

async function png(svg, size, dest) {
  await sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'contain' })
    .png({ compressionLevel: 9 })
    .toFile(dest);
  console.log('wrote', dest);
}

await png(icon, 192, out('icons/icon-192.png'));
await png(icon, 512, out('icons/icon-512.png'));
await png(maskable, 512, out('icons/icon-maskable-512.png'));
await png(icon, 180, out('icons/apple-touch-icon.png'));

await sharp(og, { density: 192 })
  .resize(1200, 630)
  .png({ compressionLevel: 9 })
  .toFile(out('og-image.png'));
console.log('wrote', out('og-image.png'));
