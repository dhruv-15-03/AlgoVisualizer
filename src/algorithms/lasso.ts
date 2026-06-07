import lassoSource from '@/algorithms/python/lasso.py?raw';
import type { AlgorithmMeta } from '@/types/algorithm';

export const lassoMeta: AlgorithmMeta = {
  id: 'lasso',
  family: 'linreg',
  name: 'Lasso Regression',
  shortDescription: 'Linear regression with L1 penalty — produces sparse models.',
  longDescription:
    "Lasso is like Ridge but uses an L1 penalty α‖w‖₁ instead of L2. The crucial difference: L1 has a 'corner' at 0, so optimization tends to drive entire feature weights to exactly 0 — automatic feature selection. We use proximal gradient descent (ISTA) with soft-thresholding.",
  category: 'supervised-regression',
  task: 'regression',
  pythonFilename: 'lasso.py',
  defaultCode: lassoSource,
  sklearnSnippet: `from sklearn.linear_model import Lasso

model = Lasso(alpha=0.4)
model.fit(X, y)`,
  hyperparams: [
    {
      id: 'alpha',
      label: 'α (L1 strength)',
      codeKey: 'alpha=',
      type: 'float',
      min: 0,
      max: 5,
      step: 0.05,
      default: 0.4,
      description: 'Higher α = sparser model (more zero weights).',
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
      default: 150,
    },
  ],
  timeComplexity: 'O(n · d · epochs)',
  spaceComplexity: 'O(d)',
  pros: ['Automatic feature selection', 'Interpretable sparse models', 'Works in n < d regime'],
  cons: ["No closed-form solution (need iterative or LARS)", "Can be unstable when features are correlated"],
  compatibleTasks: ['regression'],
  references: [
    { kind: 'wiki', label: 'Wikipedia: Lasso (statistics)', url: 'https://en.wikipedia.org/wiki/Lasso_(statistics)' },
    { kind: 'sklearn', label: 'scikit-learn user guide: Lasso', url: 'https://scikit-learn.org/stable/modules/linear_model.html#lasso' },
    { kind: 'video', label: 'StatQuest: Lasso (L1) regularization', url: 'https://www.youtube.com/watch?v=NGf0voTMlcs' },
  ],
};
