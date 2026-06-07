import dbscanSource from '@/algorithms/python/dbscan.py?raw';
import type { AlgorithmMeta } from '@/types/algorithm';

export const dbscanMeta: AlgorithmMeta = {
  id: 'dbscan',
  family: 'cluster',
  name: 'DBSCAN',
  shortDescription: 'Density-based clustering — finds arbitrary shapes and flags noise.',
  longDescription:
    "DBSCAN doesn't need you to specify k. It grows clusters from 'core' points (those with enough neighbors within distance eps) and propagates the cluster label along chains of density-connected points. Points without enough neighbors stay unlabeled (noise = label -1).",
  category: 'unsupervised-clustering',
  task: 'clustering',
  pythonFilename: 'dbscan.py',
  defaultCode: dbscanSource,
  sklearnSnippet: `from sklearn.cluster import DBSCAN

model = DBSCAN(eps=0.5, min_samples=5)
labels = model.fit_predict(X)`,
  hyperparams: [
    {
      id: 'eps',
      label: 'eps (radius)',
      codeKey: 'eps=',
      type: 'float',
      min: 0.05,
      max: 2.0,
      step: 0.05,
      default: 0.5,
      description: 'Neighborhood radius. Too small = many noise points; too large = single mega-cluster.',
    },
    {
      id: 'min_pts',
      label: 'min_pts',
      codeKey: 'min_pts=',
      type: 'int',
      min: 2,
      max: 20,
      step: 1,
      default: 5,
      description: 'Minimum neighbors to be a core point.',
    },
  ],
  timeComplexity: 'O(n²) (with naive neighbor search)',
  spaceComplexity: 'O(n²) for the distance matrix',
  pros: ["Finds clusters of arbitrary shape", "Identifies noise / outliers", "No need to pick k"],
  cons: ["Sensitive to eps and min_pts", "Bad on varying-density data", "Doesn't scale well"],
  compatibleTasks: ['clustering', 'classification'],
  references: [
    { kind: 'wiki', label: 'Wikipedia: DBSCAN', url: 'https://en.wikipedia.org/wiki/DBSCAN' },
    { kind: 'sklearn', label: 'scikit-learn user guide: DBSCAN', url: 'https://scikit-learn.org/stable/modules/clustering.html#dbscan' },
    { kind: 'video', label: 'StatQuest: DBSCAN clearly explained', url: 'https://www.youtube.com/watch?v=RDZUdRSDOok' },
  ],
};
