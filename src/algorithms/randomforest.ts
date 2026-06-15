import type { AlgorithmMeta } from '@/types/algorithm';

export const randomforestMeta: AlgorithmMeta = {
  id: 'randomforest',
  family: 'forest',
  name: 'Random Forest',
  shortDescription: 'Ensemble of decision trees grown on bootstrap samples; predicts by majority vote.',
  longDescription:
    "Random Forest combines two ideas: (1) bagging — train each tree on a different bootstrap sample of the data, (2) random subspace — at each split, only consider a random subset of features. This decorrelates the trees, so averaging their predictions sharply reduces variance without much bias increase.",
  category: 'supervised-classification',
  task: 'classification',
  pythonFilename: 'randomforest.py',
  sklearnSnippet: `from sklearn.ensemble import RandomForestClassifier

model = RandomForestClassifier(n_estimators=10, max_depth=4, random_state=0)
model.fit(X, y)
y_pred = model.predict(X_new)`,
  hyperparams: [
    {
      id: 'n_trees',
      label: 'n_trees',
      codeKey: 'n_trees=',
      type: 'int',
      min: 3,
      max: 50,
      step: 1,
      default: 10,
      description: 'More trees → smoother boundary, slower training.',
    },
    {
      id: 'max_depth',
      label: 'Max depth',
      codeKey: 'max_depth=',
      type: 'int',
      min: 1,
      max: 10,
      step: 1,
      default: 4,
    },
    {
      id: 'max_features',
      label: 'Features per split',
      codeKey: 'max_features=',
      type: 'int',
      min: 1,
      max: 4,
      step: 1,
      default: 2,
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
  timeComplexity: 'O(T · n · log n · m)',
  spaceComplexity: 'O(T · n)',
  pros: ['Strong out-of-the-box performance', 'Handles non-linear, high-dim data', 'Built-in feature importance'],
  cons: ['Slower to predict than a single tree', 'Less interpretable than one tree', 'Memory-heavy with many trees'],
  compatibleTasks: ['classification'],
  references: [
    { kind: 'wiki', label: 'Wikipedia: Random forest', url: 'https://en.wikipedia.org/wiki/Random_forest' },
    { kind: 'sklearn', label: 'scikit-learn user guide: Random forests', url: 'https://scikit-learn.org/stable/modules/ensemble.html#random-forests' },
    { kind: 'video', label: 'StatQuest: Random Forests Part 1 — building, using and evaluating', url: 'https://www.youtube.com/watch?v=J4Wdy0Wc_xQ' },
  ],
};
