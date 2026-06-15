import type { AlgorithmMeta } from '@/types/algorithm';

export const qlearningMeta: AlgorithmMeta = {
  id: 'qlearning',
  family: 'rl',
  name: 'Q-Learning',
  shortDescription: 'Tabular off-policy value learning that finds the optimal path by trial and error.',
  longDescription:
    "Q-Learning is the canonical reinforcement-learning algorithm. The agent keeps a table Q[state, action] estimating the long-run reward of each move and refines it from experience with the temporal-difference update Q[s,a] ← Q[s,a] + α(r + γ·maxₐ′Q[s′,a′] − Q[s,a]). It explores with an ε-greedy policy whose randomness decays over time. Because it bootstraps off its own best estimate of the next state, it converges to the optimal policy without ever needing a model of the environment. Here it learns to cross a gridworld to the goal (+1) while dodging the trap (−1).",
  category: 'reinforcement',
  task: 'reinforcement',
  pythonFilename: 'qlearning.py',
  sklearnSnippet: `# RL lives outside sklearn — the industry stack is Gymnasium + a learner.
import gymnasium as gym
import numpy as np

env = gym.make("FrozenLake-v1", is_slippery=False)
Q = np.zeros((env.observation_space.n, env.action_space.n))

for episode in range(500):
    s, _ = env.reset()
    done = False
    while not done:
        a = env.action_space.sample() if np.random.rand() < 0.1 else Q[s].argmax()
        s2, r, term, trunc, _ = env.step(a)
        Q[s, a] += 0.1 * (r + 0.95 * Q[s2].max() - Q[s, a])
        s, done = s2, term or trunc`,
  hyperparams: [
    { id: 'episodes', label: 'Episodes', codeKey: 'episodes=', type: 'int', min: 20, max: 200, step: 10, default: 60 },
    { id: 'lr', label: 'Learning rate (α)', codeKey: 'lr=', type: 'float', min: 0.01, max: 0.5, step: 0.01, default: 0.1 },
    { id: 'gamma', label: 'Discount (γ)', codeKey: 'gamma=', type: 'float', min: 0.5, max: 0.99, step: 0.01, default: 0.95 },
    { id: 'epsilon', label: 'Explore (ε₀)', codeKey: 'epsilon=', type: 'float', min: 0.05, max: 1, step: 0.05, default: 0.3 },
  ],
  timeComplexity: 'O(episodes · steps)',
  spaceComplexity: 'O(states · actions)',
  pros: ['Provably converges to the optimal policy', 'Model-free — needs no map of the world', 'Simple, interpretable value table'],
  cons: ['Table size explodes with large state spaces', 'Needs many episodes on sparse rewards', "Off-policy max can overestimate values"],
  compatibleTasks: ['reinforcement'],
  references: [
    { kind: 'wiki', label: 'Wikipedia: Q-learning', url: 'https://en.wikipedia.org/wiki/Q-learning' },
    { kind: 'paper', label: 'Watkins & Dayan (1992): Q-learning', url: 'https://link.springer.com/article/10.1007/BF00992698' },
    { kind: 'article', label: 'Sutton & Barto: Reinforcement Learning (Ch. 6)', url: 'http://incompleteideas.net/book/the-book-2nd.html' },
  ],
};
