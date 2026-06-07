import nbSource from '@/algorithms/python/naivebayes.py?raw';
import type { AlgorithmMeta } from '@/types/algorithm';

export const naivebayesMeta: AlgorithmMeta = {
  id: 'naivebayes',
  family: 'boundary',
  name: 'Gaussian Naive Bayes',
  shortDescription: 'Fits a Gaussian per class per feature, predicts via Bayes\u2019 rule.',
  longDescription:
    "Despite the 'naive' assumption that features are conditionally independent given the class, Gaussian NB is remarkably strong, especially on small datasets. Fitting is closed-form: compute the per-class mean and variance for each feature. Predictions use Bayes\u2019 rule with log probabilities for numerical stability.",
  category: 'supervised-classification',
  task: 'classification',
  pythonFilename: 'naivebayes.py',
  defaultCode: nbSource,
  sklearnSnippet: `from sklearn.naive_bayes import GaussianNB

model = GaussianNB()
model.fit(X, y)
y_pred = model.predict(X_new)`,
  hyperparams: [
    {
      id: 'smoothing',
      label: 'Variance smoothing',
      codeKey: 'smoothing=',
      type: 'float',
      min: 1e-12,
      max: 1.0,
      step: 0.01,
      default: 1e-9,
      description: 'Added to variances to avoid divide-by-zero on near-constant features.',
    },
  ],
  timeComplexity: 'O(n · d · C)',
  spaceComplexity: 'O(d · C)',
  pros: ['Trains in one pass', 'Works on small data', 'Probabilistic outputs come for free'],
  cons: ['Independence assumption rarely holds', 'Struggles when features are heavily correlated'],
  compatibleTasks: ['classification'],
  references: [
    { kind: 'wiki', label: 'Wikipedia: Naive Bayes classifier', url: 'https://en.wikipedia.org/wiki/Naive_Bayes_classifier' },
    { kind: 'sklearn', label: 'scikit-learn user guide: Naive Bayes', url: 'https://scikit-learn.org/stable/modules/naive_bayes.html' },
    { kind: 'video', label: 'StatQuest: Gaussian Naive Bayes', url: 'https://www.youtube.com/watch?v=H3EjCKtlVog' },
  ],
};
