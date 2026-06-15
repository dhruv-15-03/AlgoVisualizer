import type { AlgorithmMeta } from '@/types/algorithm';

export const kmeansMeta: AlgorithmMeta = {
  id: 'kmeans',
  family: 'kmeans',
  name: 'K-Means',
  shortDescription: 'Unsupervised clustering: partition points into K groups via alternating assign/update steps.',
  longDescription:
    "Lloyd's algorithm alternates two steps until centroids stop moving: (1) assign each point to its nearest centroid, (2) move each centroid to the mean of its assigned points. Converges to a local optimum; sensitive to initialization.",
  category: 'unsupervised-clustering',
  task: 'clustering',
  pythonFilename: 'kmeans.py',
  sklearnSnippet: `from sklearn.cluster import KMeans

model = KMeans(n_clusters=3, random_state=0, n_init=10)
model.fit(X)
labels = model.labels_
centroids = model.cluster_centers_`,
  hyperparams: [
    {
      id: 'k',
      label: 'k (clusters)',
      codeKey: 'k=',
      type: 'int',
      min: 2,
      max: 8,
      step: 1,
      default: 3,
      description: 'Number of clusters to discover.',
    },
    {
      id: 'max_iter',
      label: 'Max iterations',
      codeKey: 'max_iter=',
      type: 'int',
      min: 5,
      max: 100,
      step: 1,
      default: 20,
      description: 'Stop after this many assign/update cycles even if not converged.',
    },
    {
      id: 'seed',
      label: 'Random seed',
      codeKey: 'seed=',
      type: 'int',
      min: 0,
      max: 99,
      step: 1,
      default: 0,
      description: 'Seed for the random centroid initialization.',
    },
  ],
  timeComplexity: 'O(n · k · d · iters)',
  spaceComplexity: 'O(n · d + k · d)',
  pros: ['Fast, scales to large n', 'Easy to understand', 'Works well on spherical clusters'],
  cons: ['Must pick k in advance', 'Sensitive to initialization & outliers', 'Assumes convex clusters'],
  compatibleTasks: ['clustering', 'classification'],
  references: [
    { kind: 'wiki', label: 'Wikipedia: K-means clustering', url: 'https://en.wikipedia.org/wiki/K-means_clustering' },
    { kind: 'sklearn', label: 'scikit-learn user guide: K-means', url: 'https://scikit-learn.org/stable/modules/clustering.html#k-means' },
    { kind: 'video', label: 'StatQuest: K-means clustering (8 min)', url: 'https://www.youtube.com/watch?v=4b5d3muPQmA' },
  ],
};
