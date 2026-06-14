# REINFORCE (Monte-Carlo policy gradient) on a gridworld.
#
# Rather than learning values and acting greedily, REINFORCE learns the policy
# directly. A table of preferences theta[state, action] defines a softmax policy
#
#     pi(a | s) = softmax(theta[s])
#
# After playing a whole episode it computes the discounted return G_t from each
# step and nudges the preferences toward actions that led to high return:
#
#     theta[s,a] <- theta[s,a] + lr * G_t * (1{a=a_t} - pi(a|s))
#
# That bracket is the gradient of log pi(a_t|s). Subtracting a baseline (the mean
# return) reduces variance. There is no value function, so the heatmap shows the
# policy's confidence max_a pi(a|s) instead of a state value.
#
# Environment cell codes: 0 empty . 1 wall . 2 goal (+1) . 3 trap (-1) . 4 start

import numpy as np

# up, right, down, left
ACTIONS = [(-1, 0), (0, 1), (1, 0), (0, -1)]


def run(X, y=None, episodes=150, lr=0.4, gamma=0.95, seed=0):
    rng = np.random.default_rng(seed)
    grid = np.asarray(X).astype(int)
    rows, cols = grid.shape
    nS, nA = rows * cols, 4

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

    def softmax(z):
        z = z - z.max()
        e = np.exp(z)
        return e / e.sum()

    theta = np.zeros((nS, nA))
    max_steps = 4 * nS

    def snapshot():
        vals, pol = [], []
        for s in range(nS):
            r, c = divmod(s, cols)
            if grid[r, c] in (1, 2, 3):
                vals.append(0.0)
                pol.append(-1)
            else:
                p = softmax(theta[s])
                vals.append(float(p.max()))   # policy confidence, not a value
                pol.append(int(p.argmax()))
        return vals, pol

    yield {
        "type": "rl:init",
        "step": 0,
        "label": "REINFORCE",
        "rows": rows,
        "cols": cols,
        "grid": grid.flatten().tolist(),
        "nActions": nA,
        "explanation": (
            f"REINFORCE on a {rows}\u00d7{cols} gridworld. Instead of values, it learns a "
            f"softmax policy directly, pushing up the probability of actions that led to "
            f"high return. Cell shading shows policy confidence (no value function)."
        ),
        "math": r"\nabla_\theta J=\mathbb{E}\big[\,G_t\,\nabla_\theta\log\pi_\theta(a_t\mid s_t)\,\big]",
    }

    for ep in range(int(episodes)):
        s = start
        states, actions, rewards = [], [], []
        path = [s]
        for _ in range(max_steps):
            p = softmax(theta[s])
            a = int(rng.choice(nA, p=p))
            ns, r, done = step(s, a)
            states.append(s)
            actions.append(a)
            rewards.append(r)
            s = ns
            path.append(s)
            if done:
                break

        # Discounted returns G_t, then a baseline to cut variance.
        G = 0.0
        returns = np.zeros(len(rewards))
        for t in range(len(rewards) - 1, -1, -1):
            G = rewards[t] + gamma * G
            returns[t] = G
        baseline = returns.mean()

        for t in range(len(states)):
            s_t, a_t = states[t], actions[t]
            p = softmax(theta[s_t])
            grad = -p
            grad[a_t] += 1.0                       # d log pi / d theta[s_t]
            theta[s_t] += lr * (returns[t] - baseline) * grad

        total = float(np.sum(rewards))
        vals, pol = snapshot()
        yield {
            "type": "rl:episode",
            "step": ep + 1,
            "iteration": ep,
            "label": "REINFORCE",
            "episode": ep,
            "values": vals,
            "policy": pol,
            "reward": total,
            "steps": len(states),
            "path": [int(p) for p in path],
            "explanation": (
                f"Episode {ep}: reward {total:+.2f} in {len(states)} steps. Actions on this "
                f"trajectory are reinforced in proportion to how much return followed them."
            ),
            "math": r"\theta_{s,a}\mathrel{+}=\alpha\,(G_t-b)\,(\mathbb{1}[a=a_t]-\pi(a\mid s))",
        }

    vals, pol = snapshot()
    yield {
        "type": "rl:converged",
        "step": int(episodes) + 1,
        "label": "REINFORCE",
        "values": vals,
        "policy": pol,
        "episodes": int(episodes),
        "reason": f"Ran {int(episodes)} episodes; the softmax policy concentrated on the best route.",
        "explanation": (
            "Done. Because it optimizes the policy directly, REINFORCE can represent "
            "stochastic strategies, but Monte-Carlo returns make it higher-variance than "
            "value-based methods."
        ),
        "math": r"\pi_\theta(a\mid s)=\operatorname{softmax}(\theta_s)",
    }
