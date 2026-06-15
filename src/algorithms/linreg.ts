import type { AlgorithmMeta } from '@/types/algorithm';

export const linregMeta: AlgorithmMeta = {
  id: 'linreg',
  family: 'linreg',
  name: 'Linear Regression (Gradient Descent)',
  shortDescription: 'Fit a line/plane to minimize mean squared error using batch gradient descent.',
  longDescription:
    'Predicts a continuous target as a linear combination of features. We minimize ½ · mean((Xw - y)²) by stepping the weights in the opposite direction of the gradient. Learning rate controls step size; epochs control how long we train.',
  category: 'supervised-regression',
  task: 'regression',
  pythonFilename: 'linreg.py',
  sklearnSnippet: `from sklearn.linear_model import SGDRegressor

model = SGDRegressor(learning_rate='constant', eta0=0.05, max_iter=80)
model.fit(X, y)
predictions = model.predict(X)`,
  hyperparams: [
    {
      id: 'lr',
      label: 'Learning rate',
      codeKey: 'lr=',
      type: 'float',
      min: 0.001,
      max: 0.5,
      step: 0.001,
      default: 0.05,
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
      default: 80,
      description: 'Number of gradient descent steps over the full dataset.',
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
  pros: ['Convex loss — guaranteed global optimum', 'Interpretable coefficients', 'Fast to train and predict'],
  cons: ['Assumes linear relationship', 'Sensitive to feature scale', 'No automatic regularization'],
  compatibleTasks: ['regression'],
  references: [
    { kind: 'wiki', label: 'Wikipedia: Linear regression', url: 'https://en.wikipedia.org/wiki/Linear_regression' },
    { kind: 'sklearn', label: 'scikit-learn user guide: Ordinary Least Squares', url: 'https://scikit-learn.org/stable/modules/linear_model.html#ordinary-least-squares' },
    { kind: 'video', label: 'StatQuest: Linear regression (27 min)', url: 'https://www.youtube.com/watch?v=nk2CQITm_eo' },
  ],
};
