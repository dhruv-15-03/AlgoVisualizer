import ridgeSource from '@/algorithms/python/ridge.py?raw';
import type { AlgorithmMeta } from '@/types/algorithm';

export const ridgeMeta: AlgorithmMeta = {
  id: 'ridge',
  family: 'linreg',
  name: 'Ridge Regression',
  shortDescription: 'Linear regression with L2 (sum-of-squares) weight penalty.',
  longDescription:
    "Plain linear regression can overfit when features are correlated or when n ≈ d. Ridge adds an L2 penalty α‖w‖² that shrinks all weights toward 0, trading a bit of training-set bias for a much lower variance on new data. Closed-form solution: w = (XᵀX + αI)⁻¹ Xᵀy.",
  category: 'supervised-regression',
  task: 'regression',
  pythonFilename: 'ridge.py',
  defaultCode: ridgeSource,
  sklearnSnippet: `from sklearn.linear_model import Ridge

model = Ridge(alpha=0.5)
model.fit(X, y)`,
  hyperparams: [
    {
      id: 'alpha',
      label: 'α (L2 strength)',
      codeKey: 'alpha=',
      type: 'float',
      min: 0,
      max: 10,
      step: 0.1,
      default: 0.5,
      description: 'Higher α = more shrinkage = simpler model.',
    },
    {
      id: 'lr',
      label: 'Learning rate',
      codeKey: 'lr=',
      type: 'float',
      min: 0.005,
      max: 0.5,
      step: 0.005,
      default: 0.05,
    },
    {
      id: 'epochs',
      label: 'Epochs',
      codeKey: 'epochs=',
      type: 'int',
      min: 20,
      max: 500,
      step: 10,
      default: 120,
    },
  ],
  timeComplexity: 'O(n · d²) closed-form, O(n · d · epochs) iterative',
  spaceComplexity: 'O(d²)',
  pros: ['Stable when features are correlated', 'Always invertible (unlike OLS)', 'Closed-form solution'],
  cons: ["Doesn't produce sparse models (all weights nonzero)", "Picking α requires CV"],
  compatibleTasks: ['regression'],
  references: [
    { kind: 'wiki', label: 'Wikipedia: Ridge regression', url: 'https://en.wikipedia.org/wiki/Ridge_regression' },
    { kind: 'sklearn', label: 'scikit-learn user guide: Ridge regression', url: 'https://scikit-learn.org/stable/modules/linear_model.html#ridge-regression-and-classification' },
    { kind: 'video', label: 'StatQuest: Ridge (L2) regularization', url: 'https://www.youtube.com/watch?v=Q81RR3yKn30' },
  ],
};
