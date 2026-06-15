import type { AlgorithmMeta } from '@/types/algorithm';

export const reinforceMeta: AlgorithmMeta = {
  id: 'reinforce',
  family: 'rl',
  name: 'REINFORCE',
  shortDescription: 'Monte-Carlo policy gradient — learn the policy directly instead of values.',
  longDescription:
    "REINFORCE optimizes the policy itself rather than learning values and acting greedily. A table of preferences θ[state, action] defines a softmax policy π(a|s). After playing a full episode it computes the discounted return Gₜ from each step and shifts the preferences toward actions that were followed by high return — the update is α·Gₜ·∇log π(aₜ|s), the policy-gradient theorem in its simplest form. Subtracting a baseline (the mean return) reduces variance. Because it uses whole-episode Monte-Carlo returns, REINFORCE is unbiased but high-variance, so it learns more slowly than value-based methods. It has no value function, so the heatmap shows the policy's confidence maxₐ π(a|s).",
  category: 'reinforcement',
  task: 'reinforcement',
  pythonFilename: 'reinforce.py',
  sklearnSnippet: `# Policy gradient in PyTorch: sample, score the return, backprop log-prob.
import torch
import torch.nn as nn

policy = nn.Sequential(nn.Linear(n_states, 64), nn.ReLU(), nn.Linear(64, n_actions))
opt = torch.optim.Adam(policy.parameters(), lr=1e-2)

for episode in episodes:
    logps, rewards = run_episode(policy)          # sample a trajectory
    returns = discounted_returns(rewards, gamma=0.99)
    loss = -(torch.stack(logps) * (returns - returns.mean())).sum()
    opt.zero_grad(); loss.backward(); opt.step()`,
  hyperparams: [
    { id: 'episodes', label: 'Episodes', codeKey: 'episodes=', type: 'int', min: 50, max: 300, step: 10, default: 150 },
    { id: 'lr', label: 'Learning rate', codeKey: 'lr=', type: 'float', min: 0.05, max: 1, step: 0.05, default: 0.4 },
    { id: 'gamma', label: 'Discount (γ)', codeKey: 'gamma=', type: 'float', min: 0.5, max: 0.99, step: 0.01, default: 0.95 },
  ],
  timeComplexity: 'O(episodes · steps)',
  spaceComplexity: 'O(states · actions)',
  pros: ['Optimizes the policy directly', 'Can represent stochastic policies', 'Foundation of modern policy-gradient methods'],
  cons: ['High variance from Monte-Carlo returns', 'Updates only after a full episode', 'Sensitive to the learning rate'],
  compatibleTasks: ['reinforcement'],
  references: [
    { kind: 'wiki', label: 'Wikipedia: Policy gradient methods', url: 'https://en.wikipedia.org/wiki/Policy_gradient_method' },
    { kind: 'paper', label: 'Williams (1992): REINFORCE', url: 'https://link.springer.com/article/10.1007/BF00992696' },
    { kind: 'article', label: 'Sutton & Barto: Reinforcement Learning (Ch. 13)', url: 'http://incompleteideas.net/book/the-book-2nd.html' },
  ],
};
