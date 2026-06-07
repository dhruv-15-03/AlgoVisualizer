/**
 * TraceEvent — the universal contract between Python algorithms (running in
 * Pyodide) and the React/D3 visualization layer.
 *
 * Every algorithm Python module exports a generator `run(X, y=None, **kwargs)`
 * that yields dicts matching one of these shapes. The worker forwards them as
 * JSON to the main thread, and the TracePlayer renders them.
 *
 * Adding a new algorithm = adding a new event family below + a small renderer.
 */

export interface BaseTraceEvent {
  /** Monotonic step index; one event = one step. */
  step: number;
  /** For iterative algorithms; absent for tree-builders, etc. */
  iteration?: number;
  /** Plain-English description for the explanation panel. */
  explanation: string;
  /** LaTeX expression for the math panel. */
  math: string;
}

// ─── K-Means ────────────────────────────────────────────────────────────────
export interface KMeansInit extends BaseTraceEvent {
  type: 'kmeans:init';
  centroids: number[][];
}
export interface KMeansAssign extends BaseTraceEvent {
  type: 'kmeans:assign';
  labels: number[];
  inertia: number;
}
export interface KMeansUpdate extends BaseTraceEvent {
  type: 'kmeans:update';
  centroids: number[][];
  moved: number;
  inertia: number;
}
export interface KMeansConverged extends BaseTraceEvent {
  type: 'kmeans:converged';
  reason: string;
}
export type KMeansEvent = KMeansInit | KMeansAssign | KMeansUpdate | KMeansConverged;

// ─── Linear Regression (Gradient Descent) ───────────────────────────────────
export interface LinRegInit extends BaseTraceEvent {
  type: 'linreg:init';
  weights: number[]; // [w_0 (bias), w_1, w_2, ...]
  loss: number;
}
export interface LinRegStep extends BaseTraceEvent {
  type: 'linreg:step';
  weights: number[];
  gradient: number[];
  loss: number;
  learningRate: number;
}
export interface LinRegConverged extends BaseTraceEvent {
  type: 'linreg:converged';
  reason: string;
  finalLoss: number;
}
export type LinRegEvent = LinRegInit | LinRegStep | LinRegConverged;

// ─── Polynomial Regression ──────────────────────────────────────────────────
export interface PolyRegInit extends BaseTraceEvent {
  type: 'polyreg:init';
  weights: number[]; // coefficients of polynomial (length = degree + 1)
  degree: number;
  loss: number;
}
export interface PolyRegStep extends BaseTraceEvent {
  type: 'polyreg:step';
  weights: number[];
  degree: number;
  loss: number;
  learningRate: number;
}
export interface PolyRegConverged extends BaseTraceEvent {
  type: 'polyreg:converged';
  weights: number[];
  degree: number;
  finalLoss: number;
  reason: string;
}
export type PolyRegEvent = PolyRegInit | PolyRegStep | PolyRegConverged;

// ─── Logistic Regression (Gradient Descent) ─────────────────────────────────
export interface LogRegInit extends BaseTraceEvent {
  type: 'logreg:init';
  weights: number[];
  loss: number;
  accuracy: number;
}
export interface LogRegStep extends BaseTraceEvent {
  type: 'logreg:step';
  weights: number[];
  gradient: number[];
  loss: number;
  accuracy: number;
  learningRate: number;
}
export interface LogRegConverged extends BaseTraceEvent {
  type: 'logreg:converged';
  reason: string;
  finalLoss: number;
  finalAccuracy: number;
}
export type LogRegEvent = LogRegInit | LogRegStep | LogRegConverged;

// ─── Decision Tree (recursive split) ────────────────────────────────────────
export interface DTreeNode {
  id: string;
  parentId: string | null;
  /** Which side of parent (root = null). */
  branch: 'left' | 'right' | null;
  depth: number;
  /** Sample indices in the node (from the training set). */
  sampleIndices: number[];
  /** Class distribution. */
  classCounts: Record<string, number>;
  prediction: number | null;
  gini: number;
}
export interface DTreeNodeOpen extends BaseTraceEvent {
  type: 'dtree:open';
  node: DTreeNode;
}
export interface DTreeSplit extends BaseTraceEvent {
  type: 'dtree:split';
  nodeId: string;
  feature: number;
  featureName: string;
  threshold: number;
  giniBefore: number;
  giniLeft: number;
  giniRight: number;
  /** Newly created child nodes. */
  leftChild: DTreeNode;
  rightChild: DTreeNode;
}
export interface DTreeLeaf extends BaseTraceEvent {
  type: 'dtree:leaf';
  nodeId: string;
  prediction: number;
  reason: string;
}
export interface DTreeDone extends BaseTraceEvent {
  type: 'dtree:done';
  totalNodes: number;
  totalLeaves: number;
  maxDepthReached: number;
}
export type DTreeEvent = DTreeNodeOpen | DTreeSplit | DTreeLeaf | DTreeDone;

// ─── Generic 2D classifier (KNN, NB, SVM, plus anything else with a boundary)
/**
 * Events emit a flattened NxN grid of predictions over the feature space's
 * bounding box. The renderer reshapes and draws contour fills + scatter.
 */
export interface BoundaryInit extends BaseTraceEvent {
  type: 'boundary:init';
  /** Human-readable label (e.g. "Fitted KNN(k=5)"). */
  label: string;
  /** Optional learnable params (e.g. SVM weights, NB means). */
  params?: Record<string, number | number[] | number[][]>;
}
export interface BoundaryStep extends BaseTraceEvent {
  type: 'boundary:step';
  label: string;
  /** Flat array of grid predictions, length = gridSize * gridSize. */
  grid: number[];
  gridSize: number;
  /** Bounding box of the grid: [xMin, xMax, yMin, yMax]. */
  bbox: [number, number, number, number];
  /** Optional loss/accuracy. */
  loss?: number;
  accuracy?: number;
  params?: Record<string, number | number[] | number[][]>;
  /** Optional support vectors (SVM) — flat indices into X. */
  supportVectors?: number[];
}
export interface BoundaryConverged extends BaseTraceEvent {
  type: 'boundary:converged';
  label: string;
  finalAccuracy?: number;
  reason: string;
}
export type BoundaryEvent = BoundaryInit | BoundaryStep | BoundaryConverged;

// ─── Generic clustering (DBSCAN, Hierarchical, GMM) ─────────────────────────
export interface ClusterInit extends BaseTraceEvent {
  type: 'cluster:init';
  label: string;
}
export interface ClusterStep extends BaseTraceEvent {
  type: 'cluster:step';
  label: string;
  /** -1 = noise/unassigned. */
  labels: number[];
  /** Optional cluster centers (for GMM, etc.). */
  centers?: number[][];
  /** Optional ellipse params for GMM: per-cluster [cx, cy, sxx, sxy, syy]. */
  covariances?: number[][];
  /** Optional metric for the metrics panel. */
  metric?: number;
  metricLabel?: string;
}
export interface ClusterMerge extends BaseTraceEvent {
  type: 'cluster:merge';
  label: string;
  labels: number[];
  /** Indices of the two clusters being merged at this step. */
  mergedA: number;
  mergedB: number;
  /** Distance between merged clusters. */
  distance: number;
  /** Number of clusters remaining. */
  numClusters: number;
}
export interface ClusterConverged extends BaseTraceEvent {
  type: 'cluster:converged';
  label: string;
  labels: number[];
  numClusters: number;
  reason: string;
}
export type ClusterEvent = ClusterInit | ClusterStep | ClusterMerge | ClusterConverged;

// ─── Dimensionality reduction (PCA, t-SNE) ──────────────────────────────────
export interface ProjectionInit extends BaseTraceEvent {
  type: 'projection:init';
  label: string;
}
export interface ProjectionStep extends BaseTraceEvent {
  type: 'projection:step';
  label: string;
  /** Projected coordinates, shape [n, 2]. */
  projected: number[][];
  /** Optional metrics. */
  varianceExplained?: number[];
  loss?: number;
}
export interface ProjectionConverged extends BaseTraceEvent {
  type: 'projection:converged';
  label: string;
  projected: number[][];
  /** Optional cumulative variance for PCA. */
  varianceExplained?: number[];
  finalLoss?: number;
  reason: string;
}
export type ProjectionEvent = ProjectionInit | ProjectionStep | ProjectionConverged;

// ─── Random Forest (forest of trees) ────────────────────────────────────────
export interface ForestTreeGrown extends BaseTraceEvent {
  type: 'forest:tree_grown';
  treeIndex: number;
  totalTrees: number;
  /** Snapshot of the tree's nodes (flattened). */
  treeSummary: {
    nodes: number;
    leaves: number;
    depth: number;
  };
  /** OOB-style accuracy after each tree. */
  ensembleAccuracy: number;
  /** Optional flat boundary grid (last few steps only, for perf). */
  grid?: number[];
  gridSize?: number;
  bbox?: [number, number, number, number];
}
export interface ForestConverged extends BaseTraceEvent {
  type: 'forest:converged';
  totalTrees: number;
  finalAccuracy: number;
  reason: string;
  grid?: number[];
  gridSize?: number;
  bbox?: [number, number, number, number];
}
export type ForestEvent = ForestTreeGrown | ForestConverged;

// ─── Multi-Layer Perceptron ─────────────────────────────────────────────────
export interface MLPInit extends BaseTraceEvent {
  type: 'mlp:init';
  /** Layer sizes including input/output, e.g. [2, 8, 4, 2]. */
  layers: number[];
  /** Per-layer weight matrices, flattened. */
  weights: number[][][];
  loss: number;
  accuracy: number;
}
export interface MLPStep extends BaseTraceEvent {
  type: 'mlp:step';
  layers: number[];
  weights: number[][][];
  loss: number;
  accuracy: number;
  learningRate: number;
  grid?: number[];
  gridSize?: number;
  bbox?: [number, number, number, number];
}
export interface MLPConverged extends BaseTraceEvent {
  type: 'mlp:converged';
  layers: number[];
  weights: number[][][];
  finalLoss: number;
  finalAccuracy: number;
  reason: string;
}
export type MLPEvent = MLPInit | MLPStep | MLPConverged;

// ─── Convolutional Neural Network ───────────────────────────────────────────
export interface CNNInit extends BaseTraceEvent {
  type: 'cnn:init';
  /** Filter weights, shape [n_filters, kh, kw]. */
  filters: number[][][];
  filterSize: [number, number];
  imageShape: [number, number];
  /** Up to 3 sample inputs, each shape [h, w]. Emitted once. */
  sampleInputs: number[][][];
  /** True class label for each sample. */
  sampleLabels: number[];
  /** Feature maps for samples after conv+ReLU: [n_samples, oh, ow, n_filters]. */
  sampleFeatureMaps: number[][][][];
  /** Predicted class probabilities for samples: [n_samples, n_classes]. */
  samplePredictions: number[][];
  loss: number;
  accuracy: number;
}
export interface CNNStep extends BaseTraceEvent {
  type: 'cnn:step';
  filters: number[][][];
  /** Sample-related fields are optional — emitted only every few epochs to save bandwidth. */
  sampleFeatureMaps?: number[][][][];
  samplePredictions?: number[][];
  loss: number;
  accuracy: number;
  learningRate: number;
}
export interface CNNConverged extends BaseTraceEvent {
  type: 'cnn:converged';
  filters: number[][][];
  sampleFeatureMaps: number[][][][];
  samplePredictions: number[][];
  finalLoss: number;
  finalAccuracy: number;
  reason: string;
}
export type CNNEvent = CNNInit | CNNStep | CNNConverged;

// ─── Universal lifecycle events ─────────────────────────────────────────────
export interface ErrorEvent extends BaseTraceEvent {
  type: 'error';
  message: string;
  pythonTraceback?: string;
}
export interface FinishedEvent extends BaseTraceEvent {
  type: 'finished';
  totalSteps: number;
}

// ─── Union ──────────────────────────────────────────────────────────────────
export type TraceEvent =
  | KMeansEvent
  | LinRegEvent
  | PolyRegEvent
  | LogRegEvent
  | DTreeEvent
  | BoundaryEvent
  | ClusterEvent
  | ProjectionEvent
  | ForestEvent
  | MLPEvent
  | CNNEvent
  | ErrorEvent
  | FinishedEvent;

export type AlgorithmFamily =
  | 'kmeans'
  | 'linreg'
  | 'polyreg'
  | 'logreg'
  | 'dtree'
  | 'boundary'
  | 'cluster'
  | 'projection'
  | 'forest'
  | 'mlp'
  | 'cnn';

const FAMILY_PREFIXES = new Set<string>([
  'kmeans',
  'linreg',
  'polyreg',
  'logreg',
  'dtree',
  'boundary',
  'cluster',
  'projection',
  'forest',
  'mlp',
  'cnn',
]);

export function familyOf(type: TraceEvent['type']): AlgorithmFamily | 'system' {
  const prefix = type.split(':')[0];
  if (FAMILY_PREFIXES.has(prefix)) return prefix as AlgorithmFamily;
  return 'system';
}
