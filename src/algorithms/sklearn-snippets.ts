/**
 * Canonical scikit-learn equivalents for each algorithm — a read-only reference
 * rendered in the Workspace info panel. Kept OUT of the algorithm metadata (and
 * therefore out of the eager Home/entry chunk) because only the lazy Workspace
 * `RightPanel` displays them. The `Record<AlgorithmId, string>` type also makes
 * a missing snippet a compile error, so every algorithm stays covered. Mirrors
 * the lazy-source pattern in `algorithm-sources.ts`.
 */

import type { AlgorithmId } from '@/types/algorithm';

export const SKLEARN_SNIPPETS: Record<AlgorithmId, string> = {
  logreg: "from sklearn.linear_model import LogisticRegression\n\nmodel = LogisticRegression(C=1e6, max_iter=100, solver='lbfgs')\nmodel.fit(X, y)\nprobabilities = model.predict_proba(X)",
  knn: "from sklearn.neighbors import KNeighborsClassifier\n\nmodel = KNeighborsClassifier(n_neighbors=5)\nmodel.fit(X, y)\ny_pred = model.predict(X_new)",
  naivebayes: "from sklearn.naive_bayes import GaussianNB\n\nmodel = GaussianNB()\nmodel.fit(X, y)\ny_pred = model.predict(X_new)",
  svm: "from sklearn.svm import LinearSVC\n\nmodel = LinearSVC(C=1.0, loss='hinge')\nmodel.fit(X, y)\ny_pred = model.predict(X_new)",
  dtree: "from sklearn.tree import DecisionTreeClassifier\n\nmodel = DecisionTreeClassifier(max_depth=4, min_samples_split=4, criterion='gini')\nmodel.fit(X, y)\npredictions = model.predict(X)",
  randomforest: "from sklearn.ensemble import RandomForestClassifier\n\nmodel = RandomForestClassifier(n_estimators=10, max_depth=4, random_state=0)\nmodel.fit(X, y)\ny_pred = model.predict(X_new)",
  gbm: "from sklearn.ensemble import GradientBoostingClassifier\n\nmodel = GradientBoostingClassifier(\n    n_estimators=30, learning_rate=0.1, max_depth=1)\nmodel.fit(X, y)\ny_pred = model.predict(X_new)",
  mlp: "from sklearn.neural_network import MLPClassifier\n\nmodel = MLPClassifier(hidden_layer_sizes=(8, 8), learning_rate_init=0.1, max_iter=80)\nmodel.fit(X, y)\ny_pred = model.predict(X_new)",
  cnn: "# Real CNNs use PyTorch / TensorFlow:\nimport torch\nimport torch.nn as nn\n\nclass TinyCNN(nn.Module):\n    def __init__(self, n_filters=4, n_classes=3):\n        super().__init__()\n        self.conv = nn.Conv2d(1, n_filters, kernel_size=3)\n        self.pool = nn.MaxPool2d(2)\n        self.fc = nn.Linear(n_filters * 5 * 5, n_classes)\n    def forward(self, x):\n        x = torch.relu(self.conv(x))\n        x = self.pool(x)\n        return self.fc(x.flatten(1))\n\nmodel = TinyCNN()\nopt = torch.optim.SGD(model.parameters(), lr=0.1)",
  linreg: "from sklearn.linear_model import SGDRegressor\n\nmodel = SGDRegressor(learning_rate='constant', eta0=0.05, max_iter=80)\nmodel.fit(X, y)\npredictions = model.predict(X)",
  polyreg: "from sklearn.preprocessing import PolynomialFeatures\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.pipeline import make_pipeline\n\nmodel = make_pipeline(PolynomialFeatures(degree=3), LinearRegression())\nmodel.fit(X, y)",
  ridge: "from sklearn.linear_model import Ridge\n\nmodel = Ridge(alpha=0.5)\nmodel.fit(X, y)",
  lasso: "from sklearn.linear_model import Lasso\n\nmodel = Lasso(alpha=0.4)\nmodel.fit(X, y)",
  elasticnet: "from sklearn.linear_model import ElasticNet\n\nmodel = ElasticNet(alpha=0.5, l1_ratio=0.5)\nmodel.fit(X, y)",
  kmeans: "from sklearn.cluster import KMeans\n\nmodel = KMeans(n_clusters=3, random_state=0, n_init=10)\nmodel.fit(X)\nlabels = model.labels_\ncentroids = model.cluster_centers_",
  dbscan: "from sklearn.cluster import DBSCAN\n\nmodel = DBSCAN(eps=0.5, min_samples=5)\nlabels = model.fit_predict(X)",
  hierarchical: "from sklearn.cluster import AgglomerativeClustering\n\nmodel = AgglomerativeClustering(n_clusters=3, linkage='single')\nlabels = model.fit_predict(X)",
  gmm: "from sklearn.mixture import GaussianMixture\n\nmodel = GaussianMixture(n_components=3, random_state=0)\nlabels = model.fit_predict(X)",
  pca: "from sklearn.decomposition import PCA\n\nmodel = PCA(n_components=2)\nX_proj = model.fit_transform(X)\nprint(model.explained_variance_ratio_)",
  tsne: "from sklearn.manifold import TSNE\n\nmodel = TSNE(n_components=2, perplexity=20, n_iter=300, random_state=0)\nX_emb = model.fit_transform(X)",
  autoencoder: "import torch.nn as nn\n\nae = nn.Sequential(\n    nn.Linear(n_features, 2), nn.Tanh(),  # encoder → bottleneck\n    nn.Linear(2, n_features),             # decoder\n)\n# train to minimize MSE(ae(X), X); the bottleneck is the embedding",
  qlearning: "# RL lives outside sklearn — the industry stack is Gymnasium + a learner.\nimport gymnasium as gym\nimport numpy as np\n\nenv = gym.make(\"FrozenLake-v1\", is_slippery=False)\nQ = np.zeros((env.observation_space.n, env.action_space.n))\n\nfor episode in range(500):\n    s, _ = env.reset()\n    done = False\n    while not done:\n        a = env.action_space.sample() if np.random.rand() < 0.1 else Q[s].argmax()\n        s2, r, term, trunc, _ = env.step(a)\n        Q[s, a] += 0.1 * (r + 0.95 * Q[s2].max() - Q[s, a])\n        s, done = s2, term or trunc",
  dqn: "# Production DQN: Gymnasium env + Stable-Baselines3.\nimport gymnasium as gym\nfrom stable_baselines3 import DQN\n\nenv = gym.make(\"CartPole-v1\")\nmodel = DQN(\n    \"MlpPolicy\", env,\n    learning_rate=1e-3,\n    buffer_size=50_000,        # experience replay\n    target_update_interval=500, # target network sync\n    exploration_fraction=0.2,\n)\nmodel.learn(total_timesteps=100_000)",
  reinforce: "# Policy gradient in PyTorch: sample, score the return, backprop log-prob.\nimport torch\nimport torch.nn as nn\n\npolicy = nn.Sequential(nn.Linear(n_states, 64), nn.ReLU(), nn.Linear(64, n_actions))\nopt = torch.optim.Adam(policy.parameters(), lr=1e-2)\n\nfor episode in episodes:\n    logps, rewards = run_episode(policy)          # sample a trajectory\n    returns = discounted_returns(rewards, gamma=0.99)\n    loss = -(torch.stack(logps) * (returns - returns.mean())).sum()\n    opt.zero_grad(); loss.backward(); opt.step()",
  actorcritic: "# Modern actor-critic (A2C) via Stable-Baselines3.\nimport gymnasium as gym\nfrom stable_baselines3 import A2C\n\nenv = gym.make(\"CartPole-v1\")\nmodel = A2C(\n    \"MlpPolicy\", env,\n    learning_rate=7e-4,\n    gamma=0.99,\n    n_steps=5,          # TD bootstrap horizon\n)\nmodel.learn(total_timesteps=100_000)",
};

export function getSklearnSnippet(id: AlgorithmId): string {
  return SKLEARN_SNIPPETS[id] ?? '';
}
