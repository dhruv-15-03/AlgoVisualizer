import type { AlgorithmMeta } from '@/types/algorithm';

export const actorcriticMeta: AlgorithmMeta = {
  id: 'actorcritic',
  family: 'rl',
  name: 'Actor-Critic',
  shortDescription: 'Combines a policy (actor) with a learned value baseline (critic) for low-variance updates.',
  longDescription:
    "Actor-Critic fuses the two families. A critic learns a state-value table V[s] (like value methods), while an actor learns a softmax policy θ[s,a] (like REINFORCE). At every step the critic supplies a one-step temporal-difference error δ = r + γ·V[s′] − V[s] that doubles as a low-variance advantage signal: the critic is nudged toward δ and the actor's preferences are pushed by δ·∇log π(a|s). Because the actor is updated every step from a learned baseline — rather than waiting for a full Monte-Carlo return — it has far lower variance than REINFORCE and usually learns faster and more steadily. The heatmap shows the critic's V[s]; the arrows show the actor's greedy policy.",
  category: 'reinforcement',
  task: 'reinforcement',
  pythonFilename: 'actorcritic.py',
  sklearnSnippet: `# Modern actor-critic (A2C) via Stable-Baselines3.
import gymnasium as gym
from stable_baselines3 import A2C

env = gym.make("CartPole-v1")
model = A2C(
    "MlpPolicy", env,
    learning_rate=7e-4,
    gamma=0.99,
    n_steps=5,          # TD bootstrap horizon
)
model.learn(total_timesteps=100_000)`,
  hyperparams: [
    { id: 'episodes', label: 'Episodes', codeKey: 'episodes=', type: 'int', min: 30, max: 150, step: 10, default: 70 },
    { id: 'lr_actor', label: 'Actor LR', codeKey: 'lr_actor=', type: 'float', min: 0.01, max: 0.5, step: 0.01, default: 0.2 },
    { id: 'lr_critic', label: 'Critic LR', codeKey: 'lr_critic=', type: 'float', min: 0.01, max: 0.5, step: 0.01, default: 0.2 },
    { id: 'gamma', label: 'Discount (γ)', codeKey: 'gamma=', type: 'float', min: 0.5, max: 0.99, step: 0.01, default: 0.95 },
  ],
  timeComplexity: 'O(episodes · steps)',
  spaceComplexity: 'O(states · actions)',
  pros: ['Low-variance updates via the critic baseline', 'Learns online, every step', 'Bridges value and policy methods'],
  cons: ['Two interacting learners to tune', 'Critic bias can mislead the actor', 'Less stable than pure value methods if mistuned'],
  compatibleTasks: ['reinforcement'],
  references: [
    { kind: 'wiki', label: 'Wikipedia: Actor-critic algorithm', url: 'https://en.wikipedia.org/wiki/Actor-critic_algorithm' },
    { kind: 'paper', label: 'Mnih et al. (2016): Asynchronous Methods (A3C)', url: 'https://arxiv.org/abs/1602.01783' },
    { kind: 'article', label: 'Sutton & Barto: Reinforcement Learning (Ch. 13.5)', url: 'http://incompleteideas.net/book/the-book-2nd.html' },
  ],
};
