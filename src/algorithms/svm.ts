import svmSource from '@/algorithms/python/svm.py?raw';
import type { AlgorithmMeta } from '@/types/algorithm';

export const svmMeta: AlgorithmMeta = {
  id: 'svm',
  family: 'boundary',
  name: 'Linear SVM',
  shortDescription: 'Maximum-margin linear classifier trained by sub-gradient descent on hinge loss.',
  longDescription:
    "SVM finds the linear boundary that maximizes the margin between classes. We optimize the hinge loss + L2 regularization via sub-gradient descent. Points on or inside the margin become 'support vectors' and entirely determine the boundary — points far from the boundary don't matter.",
  category: 'supervised-classification',
  task: 'classification',
  pythonFilename: 'svm.py',
  defaultCode: svmSource,
  sklearnSnippet: `from sklearn.svm import LinearSVC

model = LinearSVC(C=1.0, loss='hinge')
model.fit(X, y)
y_pred = model.predict(X_new)`,
  hyperparams: [
    {
      id: 'C',
      label: 'C (inverse reg)',
      codeKey: 'C=',
      type: 'float',
      min: 0.01,
      max: 10,
      step: 0.05,
      default: 1.0,
      description: 'Higher C = less regularization = tighter fit; risk of overfit.',
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
      min: 10,
      max: 300,
      step: 10,
      default: 80,
    },
  ],
  timeComplexity: 'O(n · d · epochs)',
  spaceComplexity: 'O(d)',
  pros: ['Maximum margin = good generalization', 'Sparse model (only support vectors matter)', 'Works in high dimensions'],
  cons: ['Linear only (without kernel)', 'Sensitive to scale', 'Slower than logistic regression'],
  compatibleTasks: ['classification'],
  maxClasses: 2,
  references: [
    { kind: 'wiki', label: 'Wikipedia: Support vector machine', url: 'https://en.wikipedia.org/wiki/Support_vector_machine' },
    { kind: 'sklearn', label: 'scikit-learn user guide: SVM', url: 'https://scikit-learn.org/stable/modules/svm.html' },
    { kind: 'video', label: 'StatQuest: Support Vector Machines main ideas', url: 'https://www.youtube.com/watch?v=efR1C6CvhmE' },
  ],
};
