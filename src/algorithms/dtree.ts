import type { AlgorithmMeta } from '@/types/algorithm';

export const dtreeMeta: AlgorithmMeta = {
  id: 'dtree',
  family: 'dtree',
  name: 'Decision Tree',
  shortDescription: 'Greedy recursive splitting: at each node pick the (feature, threshold) that drops Gini the most.',
  longDescription:
    'Builds a tree by repeatedly choosing the split that maximizes the reduction in Gini impurity. Stops when a node is pure, hits max_depth, or has too few samples. Predictions follow the path from root to leaf.',
  category: 'supervised-classification',
  task: 'classification',
  pythonFilename: 'dtree.py',
  sklearnSnippet: `from sklearn.tree import DecisionTreeClassifier

model = DecisionTreeClassifier(max_depth=4, min_samples_split=4, criterion='gini')
model.fit(X, y)
predictions = model.predict(X)`,
  hyperparams: [
    {
      id: 'max_depth',
      label: 'Max depth',
      codeKey: 'max_depth=',
      type: 'int',
      min: 1,
      max: 10,
      step: 1,
      default: 4,
      description: 'Maximum number of levels in the tree.',
    },
    {
      id: 'min_samples_split',
      label: 'Min samples / split',
      codeKey: 'min_samples_split=',
      type: 'int',
      min: 2,
      max: 30,
      step: 1,
      default: 4,
      description: 'Minimum number of samples a node must have before it can be split.',
    },
  ],
  timeComplexity: 'O(n · d · log n)',
  spaceComplexity: 'O(n) tree nodes',
  pros: ['No feature scaling needed', 'Handles non-linear boundaries', 'Highly interpretable'],
  cons: ['Easily overfits without pruning', 'Greedy splits aren\u2019t globally optimal', 'Unstable: small data changes alter the tree'],
  compatibleTasks: ['classification'],
  references: [
    { kind: 'wiki', label: 'Wikipedia: Decision tree learning', url: 'https://en.wikipedia.org/wiki/Decision_tree_learning' },
    { kind: 'sklearn', label: 'scikit-learn user guide: Decision trees', url: 'https://scikit-learn.org/stable/modules/tree.html' },
    { kind: 'video', label: 'StatQuest: Decision and classification trees', url: 'https://www.youtube.com/watch?v=_L39rN6gz7Y' },
  ],
};
