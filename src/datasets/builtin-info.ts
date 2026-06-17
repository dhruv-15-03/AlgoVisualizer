/**
 * Static catalog of built-in dataset metadata.
 *
 * The dataset picker (Home) and any "list datasets" surface only need this
 * lightweight info — id, name, shape, task — never the generated point arrays.
 * Keeping it as plain data here means listing datasets does NOT pull in the
 * synthetic generators or the Iris/Wine data tables, so none of that ships in
 * the eager Home/entry chunk. The full `Dataset` objects are built lazily on
 * first `getDataset()` (see `registry.ts`).
 *
 * Generated from the live registry. `builtin-info.test.ts` asserts this stays
 * byte-for-byte in sync with the datasets the generators actually produce, so a
 * drift (new dataset, changed sample count, etc.) fails CI loudly.
 */

import type { DatasetInfo } from '@/types/dataset';

export const BUILTIN_DATASET_INFO: DatasetInfo[] = [
  {
    id: 'iris',
    name: 'Iris',
    description: 'Classic flower-classification dataset (Fisher, 1936). 150 samples, 4 features, 3 species.',
    samples: 150,
    features: 4,
    classes: 3,
    task: 'classification',
    source: 'Fisher (1936) — public domain',
  },
  {
    id: 'wine',
    name: 'Wine (subset)',
    description: '60-sample, 4-feature, 3-cultivar subset of UCI Wine — great for PCA, RF, classification.',
    samples: 60,
    features: 4,
    classes: 3,
    task: 'classification',
    source: 'Forina (1991) · UCI ML — public domain',
  },
  {
    id: 'blobs',
    name: 'Blobs',
    description: '150 samples in 3 Gaussian blobs.',
    samples: 150,
    features: 2,
    classes: 3,
    task: 'clustering',
    source: 'Synthetic (seeded PRNG)',
  },
  {
    id: 'aniso',
    name: 'Anisotropic blobs',
    description: '180 samples in 3 elongated, non-circular clusters (breaks K-Means).',
    samples: 180,
    features: 2,
    classes: 3,
    task: 'clustering',
    source: 'Synthetic (seeded PRNG)',
  },
  {
    id: 'gmm-mix',
    name: 'Gaussian mixture',
    description: '200 samples drawn from 3 overlapping Gaussians (showcases EM / GMM).',
    samples: 200,
    features: 2,
    classes: 3,
    task: 'clustering',
    source: 'Synthetic (seeded PRNG)',
  },
  {
    id: 'varied-blobs',
    name: 'Varied-density blobs',
    description:
      "180 points in three clusters of unequal spread and size — exposes K-Means' equal-variance assumption versus DBSCAN / GMM.",
    samples: 180,
    features: 2,
    classes: 3,
    task: 'clustering',
    source: 'Synthetic (seeded PRNG)',
  },
  {
    id: 'moons',
    name: 'Moons',
    description: '200 samples in two interleaving half-moons.',
    samples: 200,
    features: 2,
    classes: 2,
    task: 'classification',
    source: 'Synthetic (seeded PRNG)',
  },
  {
    id: 'circles',
    name: 'Circles',
    description: '200 samples in two concentric circles.',
    samples: 200,
    features: 2,
    classes: 2,
    task: 'classification',
    source: 'Synthetic (seeded PRNG)',
  },
  {
    id: 'spirals',
    name: 'Spirals',
    description: '240 samples in two interleaved spirals — only non-linear classifiers can separate them.',
    samples: 240,
    features: 2,
    classes: 2,
    task: 'classification',
    source: 'Synthetic (seeded PRNG)',
  },
  {
    id: 'linear',
    name: 'Linear trend',
    description: '80 samples on the line y = 1.8x + 0.5 plus Gaussian noise.',
    samples: 80,
    features: 1,
    classes: null,
    task: 'regression',
    source: 'Synthetic (seeded PRNG)',
  },
  {
    id: 'polywave',
    name: 'Polynomial wave',
    description: '80 samples on a cubic curve plus Gaussian noise.',
    samples: 80,
    features: 1,
    classes: null,
    task: 'regression',
    source: 'Synthetic (seeded PRNG)',
  },
  {
    id: 'noisy-linear',
    name: 'Noisy multi-feature',
    description: '70 samples with 5 features (only x0 is informative) — useful for Ridge / Lasso.',
    samples: 70,
    features: 5,
    classes: null,
    task: 'regression',
    source: 'Synthetic (seeded PRNG)',
  },
  {
    id: 'sine',
    name: 'Sinusoidal trend',
    description:
      '90 samples along y = 2·sin(1.4x) plus Gaussian noise — a smooth nonlinear curve a straight line cannot fit.',
    samples: 90,
    features: 1,
    classes: null,
    task: 'regression',
    source: 'Synthetic (seeded PRNG)',
  },
  {
    id: 'collinear',
    name: 'Collinear features',
    description:
      '90 samples where x0, x1 and x2 are near-duplicates of one signal (x3 independent) — highlights how Ridge / Lasso / Elastic-Net handle multicollinearity.',
    samples: 90,
    features: 4,
    classes: null,
    task: 'regression',
    source: 'Synthetic (seeded PRNG)',
  },
  {
    id: 'friedman',
    name: 'Friedman #1',
    description:
      '120 samples from the Friedman #1 benchmark: y = 10·sin(πx0x1) + 20(x2−0.5)² + 10x3 + 5x4 + noise — nonlinear with a feature interaction.',
    samples: 120,
    features: 5,
    classes: null,
    task: 'regression',
    source: 'Synthetic (seeded PRNG)',
  },
  {
    id: 'shapes',
    name: 'Shapes (12×12 images)',
    description:
      'Tiny synthetic images: horizontal, vertical, or diagonal stripes — 3 classes for the CNN demo.',
    samples: 120,
    features: 144,
    classes: 3,
    task: 'classification',
    source: 'Synthetic',
    imageShape: {
      height: 12,
      width: 12,
    },
  },
  {
    id: 'gridworld',
    name: 'GridWorld 5×5',
    description:
      'A 5×5 gridworld: the agent starts at S and must reach the goal (G, +1) while avoiding the trap (T, −1). Walls (#) block movement and each step costs a little, so the agent learns the shortest safe path.',
    samples: 5,
    features: 5,
    classes: null,
    task: 'reinforcement',
    source: 'Synthetic gridworld',
  },
  {
    id: 'gridworld-open',
    name: 'GridWorld 4×4',
    description:
      'A compact 4×4 gridworld with fewer states, so policies converge in fewer episodes. Reach G (+1), avoid T (−1), and route around the walls (#).',
    samples: 4,
    features: 4,
    classes: null,
    task: 'reinforcement',
    source: 'Synthetic gridworld',
  },
  {
    id: 'cliff-walk',
    name: 'Cliff walk 4×6',
    description:
      'A cliff-walking gridworld: a row of traps (T) separates the start from the goal along the bottom edge. Stepping onto the cliff ends the episode with −1, so the agent learns to detour over the safe row before reaching G (+1).',
    samples: 4,
    features: 6,
    classes: null,
    task: 'reinforcement',
    source: 'Synthetic gridworld',
  },
  {
    id: 'maze',
    name: 'Maze 6×6',
    description:
      'A 6×6 maze of winding corridors with one trap (T). More states and a longer route to the goal mean value information takes more episodes to propagate back from G (+1) to the start.',
    samples: 6,
    features: 6,
    classes: null,
    task: 'reinforcement',
    source: 'Synthetic gridworld',
  },
];
