/**
 * Rotating ML facts/tips shown during the cold Pyodide load (~10–30s first
 * visit) to make the wait engaging. Pure and side-effect free so the selector is
 * unit-testable and the loading UI stays a thin declarative consumer.
 *
 * Content is intentionally bite-sized, accurate, and tool-agnostic so it reads
 * well in a small space and never goes stale relative to the app's features.
 */
export const ML_FACTS: readonly string[] = [
  'Logistic regression predicts probabilities, not just labels — the sigmoid squashes any score into 0–1.',
  'k-means always converges, but only to a local optimum — the starting centroids matter.',
  'PCA finds the directions of greatest variance; the first component captures the most spread.',
  'Gradient descent walks downhill: each step moves against the gradient of the loss.',
  'Standardizing features (zero mean, unit variance) helps distance- and gradient-based methods a lot.',
  'A decision tree keeps splitting to lower impurity — Gini and entropy are the usual yardsticks.',
  'Regularization (L1/L2) trades a little training fit for better generalization.',
  'The bias–variance tradeoff: too simple underfits, too flexible overfits.',
  'k-NN has no training step — it just remembers the data and votes among neighbours.',
  'More clusters always lowers k-means inertia; the "elbow" hints at a sensible k.',
  'Feature scaling does not change a tree, but it transforms what k-means and SVMs see.',
  'Cross-validation reuses data wisely to estimate how a model does on unseen examples.',
  'Softmax generalizes the sigmoid to many classes, turning scores into a probability distribution.',
  'Linear regression minimizes squared error — outliers pull the line harder than you might expect.',
  'Convergence means the updates got small enough that more steps barely change the answer.',
];

/**
 * Returns the fact at a (cycling) index. Wraps for any integer — positive or
 * negative — so a monotonically increasing counter can drive a carousel without
 * bounds bookkeeping. Returns '' only if the list is empty.
 */
export function factAt(index: number): string {
  const n = ML_FACTS.length;
  if (n === 0) return '';
  const i = ((Math.floor(index) % n) + n) % n;
  return ML_FACTS[i];
}

/** Number of available facts. */
export function factCount(): number {
  return ML_FACTS.length;
}
