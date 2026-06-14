import dqnSource from '@/algorithms/python/dqn.py?raw';
import type { AlgorithmMeta } from '@/types/algorithm';

export const dqnMeta: AlgorithmMeta = {
  id: 'dqn',
  family: 'rl',
  name: 'Deep Q-Network',
  shortDescription: 'Q-Learning with a neural network in place of the table — the algorithm behind Atari DQN.',
  longDescription:
    "A Deep Q-Network replaces Q-Learning's lookup table with a neural network that predicts action values from a state. That lets value learning scale to state spaces far too large to enumerate. Two ideas from DeepMind's 2015 Atari paper keep the bootstrapped training stable: experience replay (learn from random minibatches of past transitions, breaking their correlation) and a target network (a periodically-frozen copy used to compute the regression target, so it doesn't chase a moving estimate). Here each gridworld cell is fed in as a one-hot vector to a small two-layer numpy MLP trained with SGD — every line of the forward and backward pass is visible.",
  category: 'reinforcement',
  task: 'reinforcement',
  pythonFilename: 'dqn.py',
  defaultCode: dqnSource,
  sklearnSnippet: `# Production DQN: Gymnasium env + Stable-Baselines3.
import gymnasium as gym
from stable_baselines3 import DQN

env = gym.make("CartPole-v1")
model = DQN(
    "MlpPolicy", env,
    learning_rate=1e-3,
    buffer_size=50_000,        # experience replay
    target_update_interval=500, # target network sync
    exploration_fraction=0.2,
)
model.learn(total_timesteps=100_000)`,
  hyperparams: [
    { id: 'episodes', label: 'Episodes', codeKey: 'episodes=', type: 'int', min: 30, max: 150, step: 10, default: 80 },
    { id: 'lr', label: 'Learning rate', codeKey: 'lr=', type: 'float', min: 0.02, max: 0.4, step: 0.01, default: 0.15 },
    { id: 'gamma', label: 'Discount (γ)', codeKey: 'gamma=', type: 'float', min: 0.5, max: 0.99, step: 0.01, default: 0.95 },
    { id: 'epsilon', label: 'Explore (ε₀)', codeKey: 'epsilon=', type: 'float', min: 0.05, max: 1, step: 0.05, default: 0.5 },
  ],
  timeComplexity: 'O(episodes · steps · batch · params)',
  spaceComplexity: 'O(buffer + params)',
  pros: ['Generalizes values across states via a network', 'Scales past tabular methods', 'Replay + target net stabilize training'],
  cons: ['More hyperparameters to tune', 'Slower and noisier than a Q-table', 'Can diverge without the stabilizing tricks'],
  compatibleTasks: ['reinforcement'],
  references: [
    { kind: 'wiki', label: 'Wikipedia: Deep reinforcement learning', url: 'https://en.wikipedia.org/wiki/Deep_reinforcement_learning' },
    { kind: 'paper', label: 'Mnih et al. (2015): Human-level control through deep RL', url: 'https://www.nature.com/articles/nature14236' },
    { kind: 'video', label: 'DeepMind: Deep Q-Networks explained', url: 'https://www.youtube.com/watch?v=nOBm4aYEYR4' },
  ],
};
