import type { AlgorithmMeta } from '@/types/algorithm';

export const autoencoderMeta: AlgorithmMeta = {
  id: 'autoencoder',
  family: 'projection',
  name: 'Autoencoder',
  shortDescription: 'Neural net that learns a 2-D embedding by reconstructing its own input.',
  longDescription:
    "An autoencoder is a neural network trained to copy its input to its output through a narrow bottleneck. The encoder compresses each point to 2 dimensions; the decoder rebuilds the original. Because the bottleneck is too small to pass everything through, the network must keep only the most informative structure — so the 2-D bottleneck activations become a learned embedding. Unlike PCA's straight axes, the tanh non-linearity lets it bend the embedding to untangle curved structure.",
  category: 'unsupervised-dim-reduction',
  task: 'dim-reduction',
  pythonFilename: 'autoencoder.py',
  hyperparams: [
    {
      id: 'lr',
      label: 'Learning rate',
      codeKey: 'lr=',
      type: 'float',
      min: 0.005,
      max: 0.3,
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
      default: 160,
    },
  ],
  timeComplexity: 'O(n · d · epochs)',
  spaceComplexity: 'O(d)',
  pros: ['Captures non-linear structure (unlike PCA)', 'Learned, data-driven embedding', 'Bottleneck width sets the target dimension'],
  cons: ['Needs training (slower than PCA)', 'Non-deterministic — depends on init', 'Embedding axes are not interpretable'],
  compatibleTasks: ['classification', 'clustering'],
  references: [
    { kind: 'wiki', label: 'Wikipedia: Autoencoder', url: 'https://en.wikipedia.org/wiki/Autoencoder' },
    { kind: 'paper', label: 'Hinton & Salakhutdinov (2006): Reducing the Dimensionality of Data', url: 'https://www.science.org/doi/10.1126/science.1127647' },
    { kind: 'article', label: 'Keras: Building Autoencoders', url: 'https://blog.keras.io/building-autoencoders-in-keras.html' },
  ],
};
