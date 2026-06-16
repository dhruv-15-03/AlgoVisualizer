import type { AlgorithmMeta } from '@/types/algorithm';

export const gbmMeta: AlgorithmMeta = {
  id: 'gbm',
  family: 'boundary',
  name: 'Gradient Boosting',
  shortDescription: 'Additive ensemble of shallow trees fit to the residual gradient of log loss.',
  longDescription:
    "Gradient boosting builds a strong classifier as a sum of weak ones. It starts from the prior log-odds, then each round fits a small regression tree to the pseudo-residuals (the negative gradient of log loss, y − σ(F)) and adds a shrunken step F ← F + η·tree. Predictions are σ(F). Many shallow trees + a small learning rate beat one deep tree by lowering variance.",
  category: 'supervised-classification',
  task: 'classification',
  pythonFilename: 'gbm.py',
  hyperparams: [
    {
      id: 'n_estimators',
      label: 'Trees',
      codeKey: 'n_estimators=',
      type: 'int',
      min: 5,
      max: 120,
      step: 5,
      default: 30,
      description: 'More trees fit harder — eventually overfits.',
    },
    {
      id: 'lr',
      label: 'Learning rate',
      codeKey: 'lr=',
      type: 'float',
      min: 0.01,
      max: 1,
      step: 0.01,
      default: 0.1,
      description: 'Shrinkage per tree. Lower = needs more trees but generalizes better.',
    },
  ],
  timeComplexity: 'O(n · d · n_estimators)',
  spaceComplexity: 'O(n_estimators)',
  pros: ['Very accurate on tabular data', 'Reduces bias and variance via shrinkage', 'Handles non-linear boundaries'],
  cons: ['Sequential — slow to train', 'Many hyperparameters to tune', 'Overfits if over-boosted'],
  compatibleTasks: ['classification'],
  references: [
    { kind: 'wiki', label: 'Wikipedia: Gradient boosting', url: 'https://en.wikipedia.org/wiki/Gradient_boosting' },
    { kind: 'sklearn', label: 'scikit-learn user guide: Gradient boosting', url: 'https://scikit-learn.org/stable/modules/ensemble.html#gradient-boosting' },
    { kind: 'video', label: 'StatQuest: Gradient Boost (classification)', url: 'https://www.youtube.com/watch?v=jxuNLH5dXCs' },
  ],
};
