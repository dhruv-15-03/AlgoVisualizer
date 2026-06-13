import type { AlgorithmFamily } from './trace';

export type AlgorithmId =
  // Existing
  | 'kmeans'
  | 'linreg'
  | 'logreg'
  | 'dtree'
  // Supervised — classification
  | 'knn'
  | 'naivebayes'
  | 'svm'
  | 'randomforest'
  | 'gbm'
  | 'mlp'
  | 'cnn'
  // Supervised — regression
  | 'polyreg'
  | 'ridge'
  | 'lasso'
  | 'elasticnet'
  // Unsupervised — clustering
  | 'dbscan'
  | 'hierarchical'
  | 'gmm'
  // Unsupervised — dim reduction
  | 'pca'
  | 'tsne'
  | 'autoencoder'
  // Reinforcement learning
  | 'qlearning'
  | 'dqn'
  | 'reinforce'
  | 'actorcritic';

export type AlgorithmCategory =
  | 'supervised-classification'
  | 'supervised-regression'
  | 'unsupervised-clustering'
  | 'unsupervised-dim-reduction'
  | 'reinforcement';

export interface AlgorithmHyperparam {
  id: string;
  label: string;
  /** The exact string the slider patches in the Python code (e.g. "k="). */
  codeKey: string;
  type: 'int' | 'float' | 'enum';
  /** For int/float: numeric range. Ignored for enum. */
  min?: number;
  max?: number;
  step?: number;
  default: number | string;
  /** For enum: list of allowed string values. */
  options?: string[];
  description?: string;
}

export type ReferenceKind = 'wiki' | 'sklearn' | 'paper' | 'video' | 'article';

export interface AlgorithmReference {
  label: string;
  url: string;
  kind: ReferenceKind;
}

export interface AlgorithmMeta {
  id: AlgorithmId;
  family: AlgorithmFamily;
  name: string;
  shortDescription: string;
  longDescription: string;
  /** High-level grouping for the home page and dropdown. */
  category: AlgorithmCategory;
  task: 'classification' | 'regression' | 'clustering' | 'dim-reduction' | 'reinforcement';
  pythonFilename: string;
  /** The default Python source shown in the Monaco editor. */
  defaultCode: string;
  /** Equivalent canonical sklearn call (read-only reference). */
  sklearnSnippet: string;
  hyperparams: AlgorithmHyperparam[];
  /** Time complexity formula for the info card. */
  timeComplexity: string;
  spaceComplexity: string;
  pros: string[];
  cons: string[];
  /** Compatible dataset task types. */
  compatibleTasks: Array<'classification' | 'regression' | 'clustering' | 'reinforcement'>;
  /** External reading material (Wikipedia, sklearn docs, papers, etc). */
  references?: AlgorithmReference[];
}

/** Human-readable label for a category (for UI). */
export const CATEGORY_LABELS: Record<AlgorithmCategory, string> = {
  'supervised-classification': 'Supervised · Classification',
  'supervised-regression': 'Supervised · Regression',
  'unsupervised-clustering': 'Unsupervised · Clustering',
  'unsupervised-dim-reduction': 'Unsupervised · Dimensionality reduction',
  reinforcement: 'Reinforcement learning',
};

export const CATEGORY_ORDER: AlgorithmCategory[] = [
  'supervised-classification',
  'supervised-regression',
  'unsupervised-clustering',
  'unsupervised-dim-reduction',
  'reinforcement',
];
