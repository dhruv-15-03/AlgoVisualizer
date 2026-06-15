import type { AlgorithmMeta } from '@/types/algorithm';

export const gmmMeta: AlgorithmMeta = {
  id: 'gmm',
  family: 'cluster',
  name: 'Gaussian Mixture Model',
  shortDescription: 'Soft clustering with K Gaussian components fit by EM.',
  longDescription:
    "GMM models the data as drawn from K Gaussian distributions with unknown means, covariances, and mixing weights. The EM algorithm alternates: (E-step) compute the responsibility of each Gaussian for each point, (M-step) update the parameters. Unlike K-Means, GMM gives soft assignments and learns elliptical clusters.",
  category: 'unsupervised-clustering',
  task: 'clustering',
  pythonFilename: 'gmm.py',
  sklearnSnippet: `from sklearn.mixture import GaussianMixture

model = GaussianMixture(n_components=3, random_state=0)
labels = model.fit_predict(X)`,
  hyperparams: [
    {
      id: 'k',
      label: 'k (components)',
      codeKey: 'k=',
      type: 'int',
      min: 2,
      max: 8,
      step: 1,
      default: 3,
    },
    {
      id: 'max_iter',
      label: 'Max EM iterations',
      codeKey: 'max_iter=',
      type: 'int',
      min: 5,
      max: 100,
      step: 1,
      default: 30,
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
  timeComplexity: 'O(n · k · d² · iters)',
  spaceComplexity: 'O(n · k + k · d²)',
  pros: ["Soft assignments (probabilistic)", "Learns elliptical / rotated clusters", "Principled likelihood model"],
  cons: ["Slow EM convergence", "Sensitive to init", "Must pick k"],
  compatibleTasks: ['clustering', 'classification'],
  references: [
    { kind: 'wiki', label: 'Wikipedia: Mixture model', url: 'https://en.wikipedia.org/wiki/Mixture_model' },
    { kind: 'sklearn', label: 'scikit-learn user guide: Gaussian mixture models', url: 'https://scikit-learn.org/stable/modules/mixture.html' },
    { kind: 'video', label: 'StatQuest: Expectation Maximization main ideas', url: 'https://www.youtube.com/watch?v=REypj2sy_5U' },
  ],
};
