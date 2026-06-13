/**
 * Default dataset for each algorithm.
 *
 * When the user switches algorithms, the workspace keeps the current dataset if
 * it's still compatible; otherwise it falls back to the algorithm's default
 * here. Each value must be a real dataset id from `@/datasets/registry`.
 */

import type { AlgorithmId } from '@/types/algorithm';

export const DEFAULT_DATASET_BY_ALGO: Record<AlgorithmId, string> = {
  kmeans: 'blobs',
  linreg: 'linear',
  logreg: 'moons',
  dtree: 'iris',
  knn: 'moons',
  naivebayes: 'iris',
  svm: 'moons',
  randomforest: 'spirals',
  gbm: 'moons',
  mlp: 'spirals',
  cnn: 'shapes',
  polyreg: 'polywave',
  ridge: 'noisy-linear',
  lasso: 'noisy-linear',
  elasticnet: 'noisy-linear',
  dbscan: 'moons',
  hierarchical: 'blobs',
  gmm: 'gmm-mix',
  pca: 'wine',
  tsne: 'iris',
  autoencoder: 'wine',
  qlearning: 'gridworld',
  dqn: 'gridworld',
  reinforce: 'gridworld',
  actorcritic: 'gridworld',
};
