/**
 * Algorithm registry — single source of truth for the algorithm picker.
 */

import type { AlgorithmId, AlgorithmMeta, AlgorithmCategory } from '@/types/algorithm';
import { CATEGORY_ORDER } from '@/types/algorithm';
import { kmeansMeta } from '@/algorithms/kmeans';
import { linregMeta } from '@/algorithms/linreg';
import { logregMeta } from '@/algorithms/logreg';
import { dtreeMeta } from '@/algorithms/dtree';
import { knnMeta } from '@/algorithms/knn';
import { naivebayesMeta } from '@/algorithms/naivebayes';
import { svmMeta } from '@/algorithms/svm';
import { randomforestMeta } from '@/algorithms/randomforest';
import { mlpMeta } from '@/algorithms/mlp';
import { cnnMeta } from '@/algorithms/cnn';
import { polyregMeta } from '@/algorithms/polyreg';
import { ridgeMeta } from '@/algorithms/ridge';
import { lassoMeta } from '@/algorithms/lasso';
import { dbscanMeta } from '@/algorithms/dbscan';
import { hierarchicalMeta } from '@/algorithms/hierarchical';
import { gmmMeta } from '@/algorithms/gmm';
import { pcaMeta } from '@/algorithms/pca';
import { tsneMeta } from '@/algorithms/tsne';

const algorithms: AlgorithmMeta[] = [
  // Supervised — classification
  logregMeta,
  knnMeta,
  naivebayesMeta,
  svmMeta,
  dtreeMeta,
  randomforestMeta,
  mlpMeta,
  cnnMeta,
  // Supervised — regression
  linregMeta,
  polyregMeta,
  ridgeMeta,
  lassoMeta,
  // Unsupervised — clustering
  kmeansMeta,
  dbscanMeta,
  hierarchicalMeta,
  gmmMeta,
  // Unsupervised — dim reduction
  pcaMeta,
  tsneMeta,
];
const map = new Map<AlgorithmId, AlgorithmMeta>(algorithms.map((a) => [a.id, a]));

export function listAlgorithms(): AlgorithmMeta[] {
  return algorithms;
}

export function getAlgorithm(id: AlgorithmId): AlgorithmMeta | null {
  return map.get(id) ?? null;
}

export function listAlgorithmsByCategory(): Array<{
  category: AlgorithmCategory;
  algorithms: AlgorithmMeta[];
}> {
  return CATEGORY_ORDER.map((category) => ({
    category,
    algorithms: algorithms.filter((a) => a.category === category),
  }));
}
