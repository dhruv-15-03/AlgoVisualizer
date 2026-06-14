# Actor-Critic on a gridworld.
#
# Actor-Critic combines the two families: a *critic* learns a state-value table
# V[s] (like value methods), and an *actor* learns a softmax policy theta[s,a]
# (like REINFORCE). At every step the critic supplies a one-step TD error that
# acts as a low-variance advantage signal for the actor:
#
#     delta = r + gamma * V[s'] - V[s]            (TD error / advantage)
#     V[s]      <- V[s]      + lr_critic * delta
#     theta[s,.] <- theta[s,.] + lr_actor * delta * grad log pi(a|s)
#
# Bootstrapping with the critic means the actor is updated every step from a
# learned baseline rather than waiting for a full Monte-Carlo return, so it has
# far lower variance than REINFORCE. The heatmap shows the critic's V[s].
#
# Environment cell codes: 0 empty . 1 wall . 2 goal (+1) . 3 trap (-1) . 4 start

import numpy as np

# up, right, down, left
ACTIONS = [(-1, 0), (0, 1), (1, 0), (0, -1)]


def run(X, y=None, episodes=70, lr_actor=0.2, lr_critic=0.2, gamma=0.95, seed=0):
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

    theta = np.zeros((nS, nA))   # actor preferences
    V = np.zeros(nS)             # critic values
    max_steps = 4 * nS

    def snapshot():
        greedy = theta.argmax(axis=1)
        vals, pol = [], []
        for s in range(nS):
            r, c = divmod(s, cols)
            if grid[r, c] in (1, 2, 3):
                vals.append(0.0)
                pol.append(-1)
            else:
                vals.append(float(V[s]))      # critic's state value
                pol.append(int(greedy[s]))
        return vals, pol

    yield {
        "type": "rl:init",
        "step": 0,
        "label": "Actor-Critic",
        "rows": rows,
        "cols": cols,
        "grid": grid.flatten().tolist(),
        "nActions": nA,
        "explanation": (
            f"Actor-Critic on a {rows}\u00d7{cols} gridworld. A critic learns state values "
            f"V[s] while an actor learns a softmax policy; the critic's TD error tells the "
            f"actor which actions beat expectation. Cells are shaded by V[s]."
        ),
        "math": r"\delta=r+\gamma V(s')-V(s)",
    }

    for ep in range(int(episodes)):
        s = start
        path = [s]
        total = 0.0
        for _ in range(max_steps):
            p = softmax(theta[s])
            a = int(rng.choice(nA, p=p))
            ns, r, done = step(s, a)

            target = r if done else r + gamma * V[ns]
            delta = target - V[s]                 # TD error = advantage
            V[s] += lr_critic * delta

            grad = -p
            grad[a] += 1.0                         # d log pi / d theta[s]
            theta[s] += lr_actor * delta * grad

            total += r
            s = ns
            path.append(s)
            if done:
                break

        vals, pol = snapshot()
        yield {
            "type": "rl:episode",
            "step": ep + 1,
            "iteration": ep,
            "label": "Actor-Critic",
            "episode": ep,
            "values": vals,
            "policy": pol,
            "reward": float(total),
            "steps": len(path) - 1,
            "path": [int(p) for p in path],
            "explanation": (
                f"Episode {ep}: reward {total:+.2f} in {len(path) - 1} steps. The critic's "
                f"values (cell shading) and the actor's arrows improve together each step."
            ),
            "math": r"\theta_s\mathrel{+}=\alpha_a\,\delta\,(\mathbb{1}[a]-\pi);\;\; V(s)\mathrel{+}=\alpha_c\,\delta",
        }

    vals, pol = snapshot()
    yield {
        "type": "rl:converged",
        "step": int(episodes) + 1,
        "label": "Actor-Critic",
        "values": vals,
        "policy": pol,
        "episodes": int(episodes),
        "reason": f"Ran {int(episodes)} episodes; actor and critic converged together.",
        "explanation": (
            "Done. By bootstrapping off the critic, the actor learns from a low-variance "
            "advantage every step \u2014 typically faster and steadier than Monte-Carlo "
            "REINFORCE."
        ),
        "math": r"\nabla_\theta J=\mathbb{E}\big[\,\delta\,\nabla_\theta\log\pi_\theta(a\mid s)\,\big]",
    }
