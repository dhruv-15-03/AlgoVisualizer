/**
 * Wine dataset (subset) — 60 samples, 4 features, 3 cultivars.
 *
 * Features (subset of UCI Wine):
 *   0. alcohol
 *   1. malic_acid
 *   2. flavanoids
 *   3. color_intensity
 *
 * Classes: 0 = Cultivar A, 1 = Cultivar B, 2 = Cultivar C (20 each).
 *
 * Original source: Forina, M. et al. (1991), UCI ML repository — public domain.
 * The full dataset has 178 samples × 13 features; we keep a balanced 60-sample
 * 4-feature subset that fits the bundle and renders well in 2D after PCA.
 */
import type { Dataset } from '@/types/dataset';

const FEATURES: number[][] = [
  // Cultivar 0 (alcohol > 13, low malic, high flavanoids)
  [14.23, 1.71, 3.06, 5.64], [13.20, 1.78, 2.76, 4.38], [13.16, 2.36, 3.24, 5.68],
  [14.37, 1.95, 3.49, 7.80], [13.24, 2.59, 2.69, 4.32], [14.20, 1.76, 3.39, 6.75],
  [14.39, 1.87, 2.52, 5.25], [14.06, 2.15, 2.51, 5.05], [14.83, 1.64, 2.98, 5.20],
  [13.86, 1.35, 3.15, 7.22], [14.10, 2.16, 3.32, 5.75], [14.12, 1.48, 2.43, 5.00],
  [13.75, 1.73, 2.41, 4.60], [14.75, 1.73, 2.76, 5.40], [14.38, 1.87, 2.65, 7.50],
  [13.63, 1.81, 2.88, 4.95], [14.30, 1.92, 2.65, 6.75], [13.83, 1.57, 3.17, 5.00],
  [14.19, 1.59, 3.93, 7.70], [13.64, 3.10, 3.10, 5.10],
  // Cultivar 1 (alcohol 12-13, varied)
  [12.37, 0.94, 1.36, 3.05], [12.33, 1.10, 2.00, 1.95], [12.64, 1.36, 2.20, 1.20],
  [13.67, 1.25, 2.30, 6.20], [12.37, 1.13, 1.69, 1.66], [12.17, 1.45, 1.50, 1.04],
  [12.37, 1.21, 2.50, 2.65], [13.11, 1.01, 2.83, 4.10], [12.37, 1.17, 2.92, 2.94],
  [13.34, 0.94, 1.64, 1.95], [12.21, 1.19, 2.50, 1.62], [12.29, 1.61, 3.10, 1.95],
  [13.86, 1.51, 3.39, 2.88], [13.49, 1.66, 1.83, 4.10], [12.99, 1.67, 3.27, 1.92],
  [11.96, 1.09, 2.65, 1.86], [11.66, 1.88, 2.94, 1.95], [13.03, 0.90, 2.78, 1.77],
  [11.84, 2.89, 2.50, 1.30], [12.33, 0.99, 1.46, 2.30],
  // Cultivar 2 (alcohol 12.5-14, low flavanoids, high color)
  [12.86, 1.35, 0.70, 5.04], [12.88, 2.99, 0.69, 5.40], [12.81, 2.31, 0.49, 5.70],
  [12.70, 3.55, 0.43, 7.70], [12.51, 1.24, 0.83, 5.40], [12.60, 2.46, 0.58, 7.50],
  [12.25, 4.72, 1.06, 5.75], [12.53, 5.51, 1.20, 8.42], [13.49, 3.59, 0.69, 8.90],
  [12.84, 2.96, 0.68, 5.10], [12.93, 2.81, 0.75, 5.70], [13.36, 2.56, 0.50, 9.20],
  [13.52, 3.17, 0.67, 8.60], [13.62, 4.95, 0.85, 7.65], [12.25, 3.88, 0.70, 7.50],
  [13.16, 3.57, 0.61, 6.10], [13.88, 5.04, 0.85, 7.22], [12.87, 4.61, 0.91, 6.20],
  [13.32, 3.24, 0.75, 9.70], [13.08, 3.90, 0.83, 7.60],
];

const LABELS: number[] = Array.from({ length: 60 }, (_, i) => Math.floor(i / 20));

export const wine: Dataset = {
  id: 'wine',
  name: 'Wine (subset)',
  description: '60-sample, 4-feature, 3-cultivar subset of UCI Wine — great for PCA, RF, classification.',
  X: FEATURES,
  y: LABELS,
  featureNames: ['Alcohol', 'Malic acid', 'Flavanoids', 'Color intensity'],
  classNames: ['Cultivar A', 'Cultivar B', 'Cultivar C'],
  task: 'classification',
  source: 'Forina (1991) · UCI ML — public domain',
};
