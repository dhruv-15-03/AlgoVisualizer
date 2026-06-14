# Deep Q-Network (DQN) on a gridworld.
#
# Instead of a lookup table, DQN approximates the action-value function with a
# small neural network. Here each state is fed in as a one-hot vector and a
# two-layer numpy MLP (nStates -> hidden -> nActions) predicts Q-values:
#
#     Q(s, .) = relu(onehot(s) @ W1 + b1) @ W2 + b2
#
# Two ideas keep the bootstrapped training stable (both from the 2015 DQN paper):
#   * experience replay  - learn from random minibatches of past transitions,
#     which breaks the correlation between consecutive steps;
#   * a target network    - a periodically-frozen copy used to compute the TD
#     target, so the regression target doesn't chase a moving estimate.
#
# Because the input is one-hot, onehot(s) @ W1 just selects row s of W1, so the
# forward pass is cheap even though it's a "real" network. The value heatmap
# shows max_a Q(s, .) evaluated over every state.
#
# Environment cell codes: 0 empty . 1 wall . 2 goal (+1) . 3 trap (-1) . 4 start

import numpy as np

# up, right, down, left
ACTIONS = [(-1, 0), (0, 1), (1, 0), (0, -1)]


def run(X, y=None, episodes=80, lr=0.15, gamma=0.95, epsilon=0.5, seed=0):
    rng = np.random.default_rng(seed)
    grid = np.asarray(X).astype(int)
    rows, cols = grid.shape
    nS, nA = rows * cols, 4
    hidden = 24

    starts = np.argwhere(grid == 4)
    sr, sc = (int(starts[0][0]), int(starts[0][1])) if len(starts) else (0, 0)
    start = sr * cols + sc

    def step(s, a):
        r, c = divmod(s, cols)
        dr, dc = ACTIONS[a]
        nr, nc = r + dr, c + dc
        if nr < 0 or nr >= rows or nc < 0 or nc >= cols or grid[nr, nc] == 1:
            nr, nc = r, c
        ns = nr * cols + nc
        cell = grid[nr, nc]
        if cell == 2:
            return ns, 1.0, True
        if cell == 3:
            return ns, -1.0, True
        return ns, -0.025, False

    # Network parameters (He-ish init for the relu layer).
    W1 = rng.standard_normal((nS, hidden)) * np.sqrt(2.0 / nS)
    b1 = np.zeros(hidden)
    W2 = rng.standard_normal((hidden, nA)) * np.sqrt(2.0 / hidden)
    b2 = np.zeros(nA)
    tW1, tb1, tW2, tb2 = W1.copy(), b1.copy(), W2.copy(), b2.copy()

    def q_row(s, params):
        w1, c1, w2, c2 = params
        h = np.maximum(0.0, w1[s] + c1)     # one-hot input -> row select
        return h @ w2 + c2

    def q_all(params):
        w1, c1, w2, c2 = params
        H = np.maximum(0.0, w1 + c1)        # (nS, hidden)
        return H @ w2 + c2                  # (nS, nA)

    live = (W1, b1, W2, b2)

    def snapshot():
        Q = q_all(live)
        values = Q.max(axis=1)
        greedy = Q.argmax(axis=1)
        vals, pol = [], []
        for s in range(nS):
            r, c = divmod(s, cols)
            if grid[r, c] in (1, 2, 3):
                vals.append(0.0)
                pol.append(-1)
            else:
                vals.append(float(values[s]))
                pol.append(int(greedy[s]))
        return vals, pol

    buffer = []          # (s, a, r, ns, done)
    cap, batch = 500, 16
    max_steps = 3 * nS

    yield {
        "type": "rl:init",
        "step": 0,
        "label": "DQN",
        "rows": rows,
        "cols": cols,
        "grid": grid.flatten().tolist(),
        "nActions": nA,
        "explanation": (
            f"Deep Q-Network on a {rows}\u00d7{cols} gridworld. A small neural net maps each "
            f"state to its {nA} action values, trained with experience replay and a target "
            f"network for stability."
        ),
        "math": r"Q_\theta(s,a)\approx r+\gamma\max_{a'}Q_{\theta^-}(s',a')",
    }

    for ep in range(int(episodes)):
        eps = max(0.05, epsilon * (0.96 ** ep))
        s = start
        path = [s]
        total = 0.0
        for _ in range(max_steps):
            if rng.random() < eps:
                a = int(rng.integers(nA))
            else:
                qs = q_row(s, live)
                a = int(rng.choice(np.flatnonzero(qs == qs.max())))  # break ties randomly
            ns, r, done = step(s, a)
            buffer.append((s, a, r, ns, done))
            if len(buffer) > cap:
                buffer.pop(0)
            total += r
            s = ns
            path.append(s)

            # One SGD step on a random minibatch of past transitions.
            if len(buffer) >= batch:
                idx = rng.choice(len(buffer), batch, replace=False)
                bs = np.array([buffer[i][0] for i in idx])
                ba = np.array([buffer[i][1] for i in idx])
                br = np.array([buffer[i][2] for i in idx], dtype=float)
                bns = np.array([buffer[i][3] for i in idx])
                bd = np.array([buffer[i][4] for i in idx], dtype=float)

                # Forward (live net) for the sampled states.
                h_pre = W1[bs] + b1
                h = np.maximum(0.0, h_pre)            # (batch, hidden)
                q = h @ W2 + b2                       # (batch, nA)

                # TD target from the frozen target network.
                tq_next = q_all((tW1, tb1, tW2, tb2))[bns]
                target = br + gamma * tq_next.max(axis=1) * (1.0 - bd)

                # Gradient of MSE on the taken action only.
                dq = np.zeros_like(q)
                pred = q[np.arange(batch), ba]
                dq[np.arange(batch), ba] = (pred - target) / batch

                dW2 = h.T @ dq
                db2 = dq.sum(axis=0)
                dh = dq @ W2.T
                dh[h_pre <= 0] = 0.0                  # relu'
                dW1 = np.zeros_like(W1)
                np.add.at(dW1, bs, dh)                # embedding-style gradient
                db1 = dh.sum(axis=0)

                W2 -= lr * dW2
                b2 -= lr * db2
                W1 -= lr * dW1
                b1 -= lr * db1
                live = (W1, b1, W2, b2)

            if done:
                break

        # Sync the target network every few episodes.
        if ep % 3 == 0:
            tW1, tb1, tW2, tb2 = W1.copy(), b1.copy(), W2.copy(), b2.copy()

        vals, pol = snapshot()
        yield {
            "type": "rl:episode",
            "step": ep + 1,
            "iteration": ep,
            "label": "DQN",
            "episode": ep,
            "values": vals,
            "policy": pol,
            "reward": float(total),
            "steps": len(path) - 1,
            "epsilon": float(eps),
            "path": [int(p) for p in path],
            "explanation": (
                f"Episode {ep}: reward {total:+.2f} in {len(path) - 1} steps "
                f"(\u03b5={eps:.2f}). The network's predicted values are sharpening into a policy."
            ),
            "math": r"\mathcal{L}(\theta)=\big(Q_\theta(s,a)-y\big)^2,\;\; y=r+\gamma\max_{a'}Q_{\theta^-}(s',a')",
        }

    vals, pol = snapshot()
    yield {
        "type": "rl:converged",
        "step": int(episodes) + 1,
        "label": "DQN",
        "values": vals,
        "policy": pol,
        "episodes": int(episodes),
        "reason": f"Ran {int(episodes)} episodes; the Q-network approximates the optimal values.",
        "explanation": (
            "Done. The network generalizes action values across states from replayed "
            "experience, recovering the same greedy path a Q-table would."
        ),
        "math": r"\pi(s)=\arg\max_a Q_\theta(s,a)",
    }
