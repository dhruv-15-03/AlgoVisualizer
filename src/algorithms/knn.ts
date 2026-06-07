import knnSource from '@/algorithms/python/knn.py?raw';
import type { AlgorithmMeta } from '@/types/algorithm';

export const knnMeta: AlgorithmMeta = {
  id: 'knn',
  family: 'boundary',
  name: 'K-Nearest Neighbors',
  shortDescription: 'Classify a point by majority vote among its k nearest training neighbors.',
  longDescription:
    "The simplest classifier you'll ever see — no training at all. To classify a new point, compute its distance to every training point, pick the k closest, and take a majority vote. The decision boundary depends entirely on k: small k = jagged, sensitive to noise; large k = smooth, but blends classes.",
  category: 'supervised-classification',
  task: 'classification',
  pythonFilename: 'knn.py',
  defaultCode: knnSource,
  sklearnSnippet: `from sklearn.neighbors import KNeighborsClassifier

model = KNeighborsClassifier(n_neighbors=5)
model.fit(X, y)
y_pred = model.predict(X_new)`,
  hyperparams: [
    {
      id: 'k',
      label: 'k (neighbors)',
      codeKey: 'k=',
      type: 'int',
      min: 1,
      max: 25,
      step: 1,
      default: 5,
      description: 'Number of nearest neighbors to vote among. Too small overfits, too large underfits.',
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
    },
  ],
  timeComplexity: 'O(n · d) per query',
  spaceComplexity: 'O(n · d) (stores all training data)',
  pros: ['No training time', 'Non-parametric: arbitrarily complex boundaries', 'Trivially handles multi-class'],
  cons: ['Slow at prediction time', 'Sensitive to feature scaling', 'Curse of dimensionality'],
  compatibleTasks: ['classification'],
  references: [
    { kind: 'wiki', label: 'Wikipedia: k-nearest neighbors algorithm', url: 'https://en.wikipedia.org/wiki/K-nearest_neighbors_algorithm' },
    { kind: 'sklearn', label: 'scikit-learn user guide: Nearest Neighbors', url: 'https://scikit-learn.org/stable/modules/neighbors.html' },
    { kind: 'video', label: 'StatQuest: k-nearest neighbors clearly explained', url: 'https://www.youtube.com/watch?v=HVXime0nQeI' },
  ],
};
