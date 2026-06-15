import type { AlgorithmMeta } from '@/types/algorithm';

export const mlpMeta: AlgorithmMeta = {
  id: 'mlp',
  family: 'mlp',
  name: 'Multi-Layer Perceptron',
  shortDescription: 'Small feedforward neural network trained with backpropagation.',
  longDescription:
    "A two-hidden-layer neural net with tanh activations and softmax output. Trained by full-batch gradient descent on cross-entropy loss. MLPs are universal approximators — given enough width, they can fit any continuous boundary — but they can also overfit easily, so watch the loss curve and use few epochs to start.",
  category: 'supervised-classification',
  task: 'classification',
  pythonFilename: 'mlp.py',
  sklearnSnippet: `from sklearn.neural_network import MLPClassifier

model = MLPClassifier(hidden_layer_sizes=(8, 8), learning_rate_init=0.1, max_iter=80)
model.fit(X, y)
y_pred = model.predict(X_new)`,
  hyperparams: [
    {
      id: 'hidden',
      label: 'Hidden units',
      codeKey: 'hidden=',
      type: 'int',
      min: 2,
      max: 32,
      step: 1,
      default: 8,
      description: 'Number of neurons in each of the two hidden layers.',
    },
    {
      id: 'activation',
      label: 'Activation',
      codeKey: 'activation=',
      type: 'enum',
      options: ['tanh', 'relu', 'sigmoid'],
      default: 'tanh',
      description: 'tanh is smooth, relu is sharp and faster, sigmoid is classic.',
    },
    {
      id: 'lr',
      label: 'Learning rate',
      codeKey: 'lr=',
      type: 'float',
      min: 0.01,
      max: 1.0,
      step: 0.01,
      default: 0.1,
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
  timeComplexity: 'O(epochs · n · W)',
  spaceComplexity: 'O(W) (weights)',
  pros: ['Universal approximator', 'Learns hierarchical features', 'Scales to huge datasets'],
  cons: ['Many hyperparameters', 'Easy to overfit on small data', 'Slower than linear models'],
  compatibleTasks: ['classification'],
  references: [
    { kind: 'wiki', label: 'Wikipedia: Multilayer perceptron', url: 'https://en.wikipedia.org/wiki/Multilayer_perceptron' },
    { kind: 'sklearn', label: 'scikit-learn user guide: Neural networks (supervised)', url: 'https://scikit-learn.org/stable/modules/neural_networks_supervised.html' },
    { kind: 'article', label: 'Michael Nielsen — Neural Networks and Deep Learning, Chapter 1', url: 'http://neuralnetworksanddeeplearning.com/chap1.html' },
  ],
};
