/**
 * Synthetic dataset generators — seeded for reproducibility.
 *
 * Uses a small mulberry32 PRNG so seeds give identical samples across runs.
 */

import type { Dataset } from '@/types/dataset';

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

function gaussian(rand: () => number) {
  // Box-Muller.
  const u = 1 - rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function makeBlobs({
  nSamples = 150,
  centers = 3,
  std = 0.6,
  seed = 0,
}: { nSamples?: number; centers?: number; std?: number; seed?: number } = {}): Dataset {
  const rand = mulberry32(seed);
  const angleStep = (2 * Math.PI) / centers;
  const centerPts: number[][] = [];
  for (let c = 0; c < centers; c += 1) {
    centerPts.push([Math.cos(c * angleStep) * 3, Math.sin(c * angleStep) * 3]);
  }
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < nSamples; i += 1) {
    const c = i % centers;
    X.push([centerPts[c][0] + gaussian(rand) * std, centerPts[c][1] + gaussian(rand) * std]);
    y.push(c);
  }
  return {
    id: 'blobs',
    name: 'Blobs',
    description: `${nSamples} samples in ${centers} Gaussian blobs.`,
    X,
    y,
    featureNames: ['Feature 1', 'Feature 2'],
    classNames: Array.from({ length: centers }, (_, i) => `Cluster ${i}`),
    task: 'clustering',
    source: 'Synthetic (seeded PRNG)',
  };
}

export function makeMoons({
  nSamples = 200,
  noise = 0.1,
  seed = 0,
}: { nSamples?: number; noise?: number; seed?: number } = {}): Dataset {
  const rand = mulberry32(seed);
  const X: number[][] = [];
  const y: number[] = [];
  const half = Math.floor(nSamples / 2);
  for (let i = 0; i < half; i += 1) {
    const t = (Math.PI * i) / (half - 1);
    X.push([Math.cos(t) + gaussian(rand) * noise, Math.sin(t) + gaussian(rand) * noise]);
    y.push(0);
  }
  for (let i = 0; i < nSamples - half; i += 1) {
    const t = (Math.PI * i) / (nSamples - half - 1);
    X.push([1 - Math.cos(t) + gaussian(rand) * noise, 0.5 - Math.sin(t) + gaussian(rand) * noise]);
    y.push(1);
  }
  return {
    id: 'moons',
    name: 'Moons',
    description: `${nSamples} samples in two interleaving half-moons.`,
    X,
    y,
    featureNames: ['Feature 1', 'Feature 2'],
    classNames: ['Class 0', 'Class 1'],
    task: 'classification',
    source: 'Synthetic (seeded PRNG)',
  };
}

export function makeCircles({
  nSamples = 200,
  noise = 0.05,
  factor = 0.5,
  seed = 0,
}: { nSamples?: number; noise?: number; factor?: number; seed?: number } = {}): Dataset {
  const rand = mulberry32(seed);
  const X: number[][] = [];
  const y: number[] = [];
  const half = Math.floor(nSamples / 2);
  for (let i = 0; i < half; i += 1) {
    const t = (2 * Math.PI * i) / half;
    X.push([Math.cos(t) + gaussian(rand) * noise, Math.sin(t) + gaussian(rand) * noise]);
    y.push(0);
  }
  for (let i = 0; i < nSamples - half; i += 1) {
    const t = (2 * Math.PI * i) / (nSamples - half);
    X.push([Math.cos(t) * factor + gaussian(rand) * noise, Math.sin(t) * factor + gaussian(rand) * noise]);
    y.push(1);
  }
  return {
    id: 'circles',
    name: 'Circles',
    description: `${nSamples} samples in two concentric circles.`,
    X,
    y,
    featureNames: ['Feature 1', 'Feature 2'],
    classNames: ['Outer ring', 'Inner ring'],
    task: 'classification',
    source: 'Synthetic (seeded PRNG)',
  };
}

export function makeLinear({
  nSamples = 80,
  slope = 1.8,
  intercept = 0.5,
  noise = 0.4,
  seed = 0,
}: {
  nSamples?: number;
  slope?: number;
  intercept?: number;
  noise?: number;
  seed?: number;
} = {}): Dataset {
  const rand = mulberry32(seed);
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < nSamples; i += 1) {
    const x = (i / (nSamples - 1)) * 4 - 2;
    X.push([x]);
    y.push(slope * x + intercept + gaussian(rand) * noise);
  }
  return {
    id: 'linear',
    name: 'Linear trend',
    description: `${nSamples} samples on the line y = ${slope}x + ${intercept} plus Gaussian noise.`,
    X,
    y,
    featureNames: ['x'],
    task: 'regression',
    source: 'Synthetic (seeded PRNG)',
  };
}

export function makePolyData({
  nSamples = 80,
  noise = 0.5,
  seed = 0,
}: { nSamples?: number; noise?: number; seed?: number } = {}): Dataset {
  const rand = mulberry32(seed);
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < nSamples; i += 1) {
    const x = (i / (nSamples - 1)) * 4 - 2;
    X.push([x]);
    // True curve: 0.5 + 1.2 x - 0.8 x^2 + 0.4 x^3
    const ytrue = 0.5 + 1.2 * x - 0.8 * x * x + 0.4 * x * x * x;
    y.push(ytrue + gaussian(rand) * noise);
  }
  return {
    id: 'polywave',
    name: 'Polynomial wave',
    description: `${nSamples} samples on a cubic curve plus Gaussian noise.`,
    X,
    y,
    featureNames: ['x'],
    task: 'regression',
    source: 'Synthetic (seeded PRNG)',
  };
}

export function makeAnisoBlobs({
  nSamples = 180,
  seed = 0,
}: { nSamples?: number; seed?: number } = {}): Dataset {
  const rand = mulberry32(seed);
  const X: number[][] = [];
  const y: number[] = [];
  const centers: number[][] = [
    [-2.5, -1.2],
    [2.5, 1.2],
    [0, 3.0],
  ];
  // Each cluster gets a different shear transform (anisotropic).
  const transforms: number[][][] = [
    [[1.1, 0.6], [0.0, 0.3]],
    [[0.5, -0.5], [0.0, 1.2]],
    [[0.9, 0.0], [0.3, 0.4]],
  ];
  for (let i = 0; i < nSamples; i += 1) {
    const c = i % centers.length;
    const u = gaussian(rand);
    const v = gaussian(rand);
    const [t11, t12] = transforms[c][0];
    const [t21, t22] = transforms[c][1];
    X.push([centers[c][0] + t11 * u + t12 * v, centers[c][1] + t21 * u + t22 * v]);
    y.push(c);
  }
  return {
    id: 'aniso',
    name: 'Anisotropic blobs',
    description: `${nSamples} samples in 3 elongated, non-circular clusters (breaks K-Means).`,
    X,
    y,
    featureNames: ['Feature 1', 'Feature 2'],
    classNames: ['Cluster 0', 'Cluster 1', 'Cluster 2'],
    task: 'clustering',
    source: 'Synthetic (seeded PRNG)',
  };
}

export function makeSpirals({
  nSamples = 240,
  noise = 0.18,
  seed = 0,
}: { nSamples?: number; noise?: number; seed?: number } = {}): Dataset {
  const rand = mulberry32(seed);
  const X: number[][] = [];
  const y: number[] = [];
  const half = Math.floor(nSamples / 2);
  for (let i = 0; i < half; i += 1) {
    const t = (i / (half - 1)) * 2.8 * Math.PI + 0.5;
    const r = 0.1 + t * 0.25;
    X.push([r * Math.cos(t) + gaussian(rand) * noise, r * Math.sin(t) + gaussian(rand) * noise]);
    y.push(0);
  }
  for (let i = 0; i < nSamples - half; i += 1) {
    const t = (i / (nSamples - half - 1)) * 2.8 * Math.PI + 0.5;
    const r = 0.1 + t * 0.25;
    X.push([-r * Math.cos(t) + gaussian(rand) * noise, -r * Math.sin(t) + gaussian(rand) * noise]);
    y.push(1);
  }
  return {
    id: 'spirals',
    name: 'Spirals',
    description: `${nSamples} samples in two interleaved spirals — only non-linear classifiers can separate them.`,
    X,
    y,
    featureNames: ['Feature 1', 'Feature 2'],
    classNames: ['Spiral 0', 'Spiral 1'],
    task: 'classification',
    source: 'Synthetic (seeded PRNG)',
  };
}

export function makeGaussianMixture({
  nSamples = 200,
  seed = 0,
}: { nSamples?: number; seed?: number } = {}): Dataset {
  const rand = mulberry32(seed);
  const X: number[][] = [];
  const y: number[] = [];
  // Overlapping clusters of different shapes — perfect for GMM vs K-Means.
  const params: Array<{ mu: [number, number]; sx: number; sy: number; rho: number }> = [
    { mu: [-1.5, -1.0], sx: 0.6, sy: 1.0, rho: 0.3 },
    { mu: [1.8, -0.3], sx: 1.0, sy: 0.5, rho: -0.4 },
    { mu: [0.0, 2.0], sx: 0.8, sy: 0.8, rho: 0.0 },
  ];
  for (let i = 0; i < nSamples; i += 1) {
    const c = i % params.length;
    const { mu, sx, sy, rho } = params[c];
    const u = gaussian(rand);
    const v = gaussian(rand);
    const z1 = u;
    const z2 = rho * u + Math.sqrt(Math.max(0, 1 - rho * rho)) * v;
    X.push([mu[0] + sx * z1, mu[1] + sy * z2]);
    y.push(c);
  }
  return {
    id: 'gmm-mix',
    name: 'Gaussian mixture',
    description: `${nSamples} samples drawn from 3 overlapping Gaussians (showcases EM / GMM).`,
    X,
    y,
    featureNames: ['Feature 1', 'Feature 2'],
    classNames: ['Component 0', 'Component 1', 'Component 2'],
    task: 'clustering',
    source: 'Synthetic (seeded PRNG)',
  };
}

export function makeNoisyLinear({
  nSamples = 60,
  seed = 0,
}: { nSamples?: number; seed?: number } = {}): Dataset {
  // Like makeLinear but with 5 features where only feature 0 is informative.
  // Useful for Ridge / Lasso to show coefficient shrinkage and sparsity.
  const rand = mulberry32(seed);
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < nSamples; i += 1) {
    const x0 = (i / (nSamples - 1)) * 4 - 2;
    const x1 = gaussian(rand);
    const x2 = gaussian(rand);
    const x3 = gaussian(rand);
    const x4 = gaussian(rand);
    X.push([x0, x1, x2, x3, x4]);
    y.push(1.5 * x0 + 0.3 + gaussian(rand) * 0.6);
  }
  return {
    id: 'noisy-linear',
    name: 'Noisy multi-feature',
    description: `${nSamples} samples with 5 features (only x0 is informative) — useful for Ridge / Lasso.`,
    X,
    y,
    featureNames: ['x0 (signal)', 'x1 (noise)', 'x2 (noise)', 'x3 (noise)', 'x4 (noise)'],
    task: 'regression',
    source: 'Synthetic (seeded PRNG)',
  };
}

export function makeSine({
  nSamples = 90,
  noise = 0.25,
  seed = 0,
}: { nSamples?: number; noise?: number; seed?: number } = {}): Dataset {
  // A smooth nonlinear curve: rewards polynomial / KNN regression over a line.
  const rand = mulberry32(seed);
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < nSamples; i += 1) {
    const x = (i / (nSamples - 1)) * 6 - 3; // -3..3
    X.push([x]);
    y.push(Math.sin(1.4 * x) * 2 + gaussian(rand) * noise);
  }
  return {
    id: 'sine',
    name: 'Sinusoidal trend',
    description: `${nSamples} samples along y = 2·sin(1.4x) plus Gaussian noise — a smooth nonlinear curve a straight line cannot fit.`,
    X,
    y,
    featureNames: ['x'],
    task: 'regression',
    source: 'Synthetic (seeded PRNG)',
  };
}

export function makeCollinear({
  nSamples = 90,
  seed = 0,
}: { nSamples?: number; seed?: number } = {}): Dataset {
  // x0, x1 and x2 are near-duplicates of one latent signal; x3 is independent.
  // OLS splits weight arbitrarily across the collinear trio, while
  // Ridge / Lasso / Elastic-Net shrink or select — the showcase set for
  // regularized regression under multicollinearity.
  const rand = mulberry32(seed);
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < nSamples; i += 1) {
    const z = gaussian(rand); // shared latent factor
    const x0 = z + gaussian(rand) * 0.05;
    const x1 = z + gaussian(rand) * 0.05; // ≈ x0
    const x2 = 0.9 * z + gaussian(rand) * 0.08; // ≈ x0
    const x3 = gaussian(rand); // independent
    X.push([x0, x1, x2, x3]);
    y.push(2.2 * z + 1.1 * x3 + 0.3 + gaussian(rand) * 0.3);
  }
  return {
    id: 'collinear',
    name: 'Collinear features',
    description: `${nSamples} samples where x0, x1 and x2 are near-duplicates of one signal (x3 independent) — highlights how Ridge / Lasso / Elastic-Net handle multicollinearity.`,
    X,
    y,
    featureNames: ['x0 (signal)', 'x1 (≈x0)', 'x2 (≈x0)', 'x3 (independent)'],
    task: 'regression',
    source: 'Synthetic (seeded PRNG)',
  };
}

export function makeFriedman({
  nSamples = 120,
  noise = 1.0,
  seed = 0,
}: { nSamples?: number; noise?: number; seed?: number } = {}): Dataset {
  // Friedman #1 benchmark: five features in [0,1] with a nonlinear target and
  // an interaction term — a classic stress-test for curvature + interactions.
  const rand = mulberry32(seed);
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < nSamples; i += 1) {
    const x0 = rand();
    const x1 = rand();
    const x2 = rand();
    const x3 = rand();
    const x4 = rand();
    X.push([x0, x1, x2, x3, x4]);
    y.push(
      10 * Math.sin(Math.PI * x0 * x1) +
        20 * (x2 - 0.5) ** 2 +
        10 * x3 +
        5 * x4 +
        gaussian(rand) * noise,
    );
  }
  return {
    id: 'friedman',
    name: 'Friedman #1',
    description: `${nSamples} samples from the Friedman #1 benchmark: y = 10·sin(πx0x1) + 20(x2−0.5)² + 10x3 + 5x4 + noise — nonlinear with a feature interaction.`,
    X,
    y,
    featureNames: ['x0', 'x1', 'x2', 'x3', 'x4'],
    task: 'regression',
    source: 'Synthetic (seeded PRNG)',
  };
}

export function makeVariedBlobs({
  nSamples = 180,
  seed = 0,
}: { nSamples?: number; seed?: number } = {}): Dataset {
  // Three clusters with deliberately unequal spread and population. K-Means
  // (which assumes roughly equal, spherical clusters) struggles here, so it is
  // a good contrast against DBSCAN / GMM.
  const rand = mulberry32(seed);
  const centers = [
    [-3.2, 0.2],
    [2.6, 1.8],
    [1.0, -3.0],
  ];
  const stds = [0.35, 1.15, 0.6];
  const weights = [0.5, 0.3, 0.2];
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < nSamples; i += 1) {
    const r = rand();
    let c = 0;
    let acc = 0;
    for (let k = 0; k < weights.length; k += 1) {
      acc += weights[k];
      if (r <= acc) {
        c = k;
        break;
      }
    }
    X.push([centers[c][0] + gaussian(rand) * stds[c], centers[c][1] + gaussian(rand) * stds[c]]);
    y.push(c);
  }
  return {
    id: 'varied-blobs',
    name: 'Varied-density blobs',
    description: `${nSamples} points in three clusters of unequal spread and size — exposes K-Means' equal-variance assumption versus DBSCAN / GMM.`,
    X,
    y,
    featureNames: ['Feature 1', 'Feature 2'],
    classNames: ['Cluster 0', 'Cluster 1', 'Cluster 2'],
    task: 'clustering',
    source: 'Synthetic (seeded PRNG)',
  };
}
