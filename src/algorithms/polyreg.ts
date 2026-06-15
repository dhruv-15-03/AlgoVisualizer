import type { AlgorithmMeta } from '@/types/algorithm';

export const polyregMeta: AlgorithmMeta = {
  id: 'polyreg',
  family: 'polyreg',
  name: 'Polynomial Regression',
  shortDescription: 'Fits a polynomial of chosen degree by gradient descent.',
  longDescription:
    "Polynomial regression expands each input x into [1, x, x², …, x^degree] and then fits a linear model in this expanded basis. Degree 1 is just a straight line; degree 3 fits gentle curves; high degree (8+) starts to overfit wildly. Watch the bias-variance trade-off in action.",
  category: 'supervised-regression',
  task: 'regression',
  pythonFilename: 'polyreg.py',
  sklearnSnippet: `from sklearn.preprocessing import PolynomialFeatures
from sklearn.linear_model import LinearRegression
from sklearn.pipeline import make_pipeline

model = make_pipeline(PolynomialFeatures(degree=3), LinearRegression())
model.fit(X, y)`,
  hyperparams: [
    {
      id: 'degree',
      label: 'Degree',
      codeKey: 'degree=',
      type: 'int',
      min: 1,
      max: 8,
      step: 1,
      default: 3,
      description: 'Highest power of x in the polynomial. Try 8 for visible overfitting!',
    },
    {
      id: 'lr',
      label: 'Learning rate',
      codeKey: 'lr=',
      type: 'float',
      min: 0.001,
      max: 0.2,
      step: 0.001,
      default: 0.02,
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
  timeComplexity: 'O(n · d · epochs) where d = degree+1',
  spaceComplexity: 'O(n · d)',
  pros: ['Flexible: curves of any smoothness', 'Closed-form solution exists', 'Easy to interpret coefficients'],
  cons: ['High degree → wild oscillations', 'Sensitive to outliers', 'Bad extrapolation'],
  compatibleTasks: ['regression'],
  references: [
    { kind: 'wiki', label: 'Wikipedia: Polynomial regression', url: 'https://en.wikipedia.org/wiki/Polynomial_regression' },
    { kind: 'sklearn', label: 'scikit-learn user guide: Polynomial regression', url: 'https://scikit-learn.org/stable/modules/linear_model.html#polynomial-regression-extending-linear-models-with-basis-functions' },
    { kind: 'article', label: 'scikit-learn: Underfitting vs Overfitting example', url: 'https://scikit-learn.org/stable/auto_examples/model_selection/plot_underfitting_overfitting.html' },
  ],
};
