import pcaSource from '@/algorithms/python/pca.py?raw';
import type { AlgorithmMeta } from '@/types/algorithm';

export const pcaMeta: AlgorithmMeta = {
  id: 'pca',
  family: 'projection',
  name: 'Principal Component Analysis',
  shortDescription: 'Project high-dimensional data onto its directions of maximum variance.',
  longDescription:
    "PCA finds an orthogonal basis where the first axis captures as much variance as possible, the second captures the next-most (subject to being orthogonal), etc. It's the workhorse of dimensionality reduction: closed-form (eigendecomposition of the covariance matrix), interpretable, and lossy only in directions of low variance.",
  category: 'unsupervised-dim-reduction',
  task: 'dim-reduction',
  pythonFilename: 'pca.py',
  defaultCode: pcaSource,
  sklearnSnippet: `from sklearn.decomposition import PCA

model = PCA(n_components=2)
X_proj = model.fit_transform(X)
print(model.explained_variance_ratio_)`,
  hyperparams: [
    {
      id: 'n_components',
      label: 'n_components',
      codeKey: 'n_components=',
      type: 'int',
      min: 1,
      max: 4,
      step: 1,
      default: 2,
      description: 'How many principal components to keep. (Only 2 are visualized.)',
    },
  ],
  timeComplexity: 'O(min(n²d, nd²))',
  spaceComplexity: 'O(d²)',
  pros: ["Closed-form, deterministic", "Linear and interpretable", "Variance-preserving"],
  cons: ["Only captures linear structure", "Sensitive to feature scale", "Cannot 'unfold' a Swiss roll"],
  compatibleTasks: ['classification', 'clustering'],
  references: [
    { kind: 'wiki', label: 'Wikipedia: Principal component analysis', url: 'https://en.wikipedia.org/wiki/Principal_component_analysis' },
    { kind: 'sklearn', label: 'scikit-learn user guide: PCA', url: 'https://scikit-learn.org/stable/modules/decomposition.html#pca' },
    { kind: 'video', label: 'StatQuest: Principal Component Analysis (PCA), step-by-step', url: 'https://www.youtube.com/watch?v=FgakZw6K1QQ' },
  ],
};
