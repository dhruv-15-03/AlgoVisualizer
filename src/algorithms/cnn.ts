import type { AlgorithmMeta } from '@/types/algorithm';

export const cnnMeta: AlgorithmMeta = {
  id: 'cnn',
  family: 'cnn',
  name: 'Convolutional Neural Network',
  shortDescription: 'Tiny CNN that learns spatial filters end-to-end.',
  longDescription:
    "A 1-layer CNN with N learnable 3×3 filters, ReLU, 2×2 max-pooling, and a dense classifier — implemented from scratch in numpy so every gradient is visible. Trained on small synthetic 'shapes' images, the filters typically converge to interpretable edge detectors (horizontal, vertical, diagonal).",
  category: 'supervised-classification',
  task: 'classification',
  pythonFilename: 'cnn.py',
  sklearnSnippet: `# Real CNNs use PyTorch / TensorFlow:
import torch
import torch.nn as nn

class TinyCNN(nn.Module):
    def __init__(self, n_filters=4, n_classes=3):
        super().__init__()
        self.conv = nn.Conv2d(1, n_filters, kernel_size=3)
        self.pool = nn.MaxPool2d(2)
        self.fc = nn.Linear(n_filters * 5 * 5, n_classes)
    def forward(self, x):
        x = torch.relu(self.conv(x))
        x = self.pool(x)
        return self.fc(x.flatten(1))

model = TinyCNN()
opt = torch.optim.SGD(model.parameters(), lr=0.1)`,
  hyperparams: [
    {
      id: 'n_filters',
      label: 'Number of filters',
      codeKey: 'n_filters=',
      type: 'int',
      min: 2,
      max: 8,
      step: 1,
      default: 4,
      description: 'How many 3×3 convolutional kernels to learn.',
    },
    {
      id: 'lr',
      label: 'Learning rate',
      codeKey: 'lr=',
      type: 'float',
      min: 0.01,
      max: 0.5,
      step: 0.01,
      default: 0.15,
    },
    {
      id: 'epochs',
      label: 'Epochs',
      codeKey: 'epochs=',
      type: 'int',
      min: 5,
      max: 80,
      step: 1,
      default: 30,
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
  timeComplexity: 'O(n · oh · ow · kh · kw · n_filters · epochs)',
  spaceComplexity: 'O(n_filters · kh · kw + pool · n_classes)',
  pros: [
    'Translation invariance: same filter detects pattern anywhere',
    'Far fewer parameters than dense networks',
    'Filters are interpretable as edge / shape detectors',
  ],
  cons: [
    'Backprop more complex than dense MLP',
    'Pyodide-pure-numpy CNN is slow at scale',
    'Needs careful initialization + learning rate',
  ],
  compatibleTasks: ['classification'],
  references: [
    { kind: 'wiki', label: 'Wikipedia: Convolutional neural network', url: 'https://en.wikipedia.org/wiki/Convolutional_neural_network' },
    { kind: 'article', label: 'CS231n Stanford: Convolutional Networks', url: 'https://cs231n.github.io/convolutional-networks/' },
    { kind: 'article', label: 'Distill: Feature Visualization (what filters learn)', url: 'https://distill.pub/2017/feature-visualization/' },
  ],
};
