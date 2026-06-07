import logregSource from '@/algorithms/python/logreg.py?raw';
import type { AlgorithmMeta } from '@/types/algorithm';

export const logregMeta: AlgorithmMeta = {
  id: 'logreg',
  family: 'logreg',
  name: 'Logistic Regression (Gradient Descent)',
  shortDescription: 'Binary classification by fitting a sigmoid through gradient descent on cross-entropy loss.',
  longDescription:
    'Squashes a linear score w·x + b through the sigmoid to produce a probability. We minimize binary cross-entropy with gradient descent; the decision boundary is the line where probability equals 0.5.',
  category: 'supervised-classification',
  task: 'classification',
  pythonFilename: 'logreg.py',
  defaultCode: logregSource,
  sklearnSnippet: `from sklearn.linear_model import LogisticRegression

model = LogisticRegression(C=1e6, max_iter=100, solver='lbfgs')
model.fit(X, y)
probabilities = model.predict_proba(X)`,
  hyperparams: [
    {
      id: 'lr',
      label: 'Learning rate',
      codeKey: 'lr=',
      type: 'float',
      min: 0.001,
      max: 1.0,
      step: 0.001,
      default: 0.1,
      description: 'Step size for each gradient descent update.',
    },
    {
      id: 'epochs',
      label: 'Epochs',
      codeKey: 'epochs=',
      type: 'int',
      min: 10,
      max: 500,
      step: 10,
      default: 100,
      description: 'Number of full-batch gradient descent steps.',
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
      description: 'Seed for initial weight randomization.',
    },
  ],
  timeComplexity: 'O(n · d · epochs)',
  spaceComplexity: 'O(d)',
  pros: ['Outputs calibrated probabilities', 'Convex loss', 'Fast inference'],
  cons: ['Linear decision boundary only', 'Sensitive to outliers', 'Needs feature scaling'],
  compatibleTasks: ['classification'],
  references: [
    { kind: 'wiki', label: 'Wikipedia: Logistic regression', url: 'https://en.wikipedia.org/wiki/Logistic_regression' },
    { kind: 'sklearn', label: 'scikit-learn user guide: Logistic regression', url: 'https://scikit-learn.org/stable/modules/linear_model.html#logistic-regression' },
    { kind: 'video', label: 'StatQuest: Logistic regression (8 min)', url: 'https://www.youtube.com/watch?v=yIYKR4sgzI8' },
  ],
};
