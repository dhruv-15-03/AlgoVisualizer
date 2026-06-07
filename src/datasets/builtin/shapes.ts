/**
 * Tiny synthetic image dataset for CNN demos.
 *
 * 3 classes of 12×12 grayscale "shapes":
 *   0 = horizontal stripe
 *   1 = vertical stripe
 *   2 = diagonal stripe
 *
 * Each sample is a small noisy image where a single bright stripe is drawn
 * at a random position/orientation within its class. Designed so a 3×3 conv
 * filter can learn an edge detector and discriminate the classes easily,
 * making the learned filters visually interpretable.
 */

import type { Dataset } from '@/types/dataset';

const H = 12;
const W = 12;

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function emptyImg(): number[][] {
  return Array.from({ length: H }, () => Array(W).fill(0));
}

function flatten(img: number[][]): number[] {
  const out: number[] = [];
  for (let r = 0; r < H; r += 1) for (let c = 0; c < W; c += 1) out.push(img[r][c]);
  return out;
}

function addNoise(img: number[][], rand: () => number, sigma = 0.1) {
  for (let r = 0; r < H; r += 1) {
    for (let c = 0; c < W; c += 1) {
      img[r][c] = Math.max(0, Math.min(1, img[r][c] + (rand() - 0.5) * sigma));
    }
  }
}

function makeHorizontal(rand: () => number): number[][] {
  const img = emptyImg();
  const row = Math.floor(rand() * (H - 2)) + 1;
  const thick = rand() < 0.5 ? 1 : 2;
  for (let t = 0; t < thick; t += 1) {
    for (let c = 0; c < W; c += 1) img[row + t][c] = 0.9 + rand() * 0.1;
  }
  addNoise(img, rand);
  return img;
}

function makeVertical(rand: () => number): number[][] {
  const img = emptyImg();
  const col = Math.floor(rand() * (W - 2)) + 1;
  const thick = rand() < 0.5 ? 1 : 2;
  for (let t = 0; t < thick; t += 1) {
    for (let r = 0; r < H; r += 1) img[r][col + t] = 0.9 + rand() * 0.1;
  }
  addNoise(img, rand);
  return img;
}

function makeDiagonal(rand: () => number): number[][] {
  const img = emptyImg();
  const slope = rand() < 0.5 ? 1 : -1;
  const offset = Math.floor(rand() * 4) - 2;
  for (let r = 0; r < H; r += 1) {
    const c = slope === 1 ? r + offset : W - 1 - r + offset;
    if (c >= 0 && c < W) img[r][c] = 0.9 + rand() * 0.1;
    if (c + 1 >= 0 && c + 1 < W && rand() < 0.5) img[r][c + 1] = 0.7 + rand() * 0.2;
  }
  addNoise(img, rand);
  return img;
}

export function makeShapes({
  nPerClass = 40,
  seed = 7,
}: { nPerClass?: number; seed?: number } = {}): Dataset {
  const rand = mulberry32(seed);
  const X: number[][] = [];
  const y: number[] = [];
  const generators = [makeHorizontal, makeVertical, makeDiagonal];
  for (let cls = 0; cls < 3; cls += 1) {
    for (let i = 0; i < nPerClass; i += 1) {
      X.push(flatten(generators[cls](rand)));
      y.push(cls);
    }
  }
  // Shuffle
  for (let i = X.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [X[i], X[j]] = [X[j], X[i]];
    [y[i], y[j]] = [y[j], y[i]];
  }
  return {
    id: 'shapes',
    name: 'Shapes (12×12 images)',
    description: 'Tiny synthetic images: horizontal, vertical, or diagonal stripes — 3 classes for the CNN demo.',
    X,
    y,
    featureNames: Array.from({ length: H * W }, (_, i) => `px_${Math.floor(i / W)}_${i % W}`),
    classNames: ['Horizontal', 'Vertical', 'Diagonal'],
    task: 'classification',
    source: 'Synthetic',
    imageShape: { height: H, width: W },
  };
}
