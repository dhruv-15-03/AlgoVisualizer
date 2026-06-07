import hierSource from '@/algorithms/python/hierarchical.py?raw';
import type { AlgorithmMeta } from '@/types/algorithm';

export const hierarchicalMeta: AlgorithmMeta = {
  id: 'hierarchical',
  family: 'cluster',
  name: 'Hierarchical Clustering',
  shortDescription: 'Agglomerative single-linkage: repeatedly merge the two closest clusters.',
  longDescription:
    "Start with N singleton clusters. At each step, merge the two clusters with the smallest pairwise distance (we use single-linkage: distance = min over members). Continue until only n_clusters remain. The full merge history forms a dendrogram.",
  category: 'unsupervised-clustering',
  task: 'clustering',
  pythonFilename: 'hierarchical.py',
  defaultCode: hierSource,
  sklearnSnippet: `from sklearn.cluster import AgglomerativeClustering

model = AgglomerativeClustering(n_clusters=3, linkage='single')
labels = model.fit_predict(X)`,
  hyperparams: [
    {
      id: 'n_clusters',
      label: 'n_clusters',
      codeKey: 'n_clusters=',
      type: 'int',
      min: 2,
      max: 8,
      step: 1,
      default: 3,
      description: 'Stop merging when this many clusters remain.',
    },
  ],
  timeComplexity: 'O(n² log n) (naive)',
  spaceComplexity: 'O(n²)',
  pros: ['Builds a full dendrogram', "Doesn't assume cluster shape", "Deterministic — no random init"],
  cons: ["O(n²) memory", "Single-linkage prone to chaining", "No undo: once merged, always merged"],
  compatibleTasks: ['clustering', 'classification'],
  references: [
    { kind: 'wiki', label: 'Wikipedia: Hierarchical clustering', url: 'https://en.wikipedia.org/wiki/Hierarchical_clustering' },
    { kind: 'sklearn', label: 'scikit-learn user guide: Hierarchical clustering', url: 'https://scikit-learn.org/stable/modules/clustering.html#hierarchical-clustering' },
    { kind: 'video', label: 'StatQuest: Hierarchical clustering', url: 'https://www.youtube.com/watch?v=7xHsRkOdVwo' },
  ],
};
