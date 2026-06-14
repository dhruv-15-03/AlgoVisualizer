# Q-Learning on a gridworld.
#
# Tabular, off-policy temporal-difference control. The agent keeps a table
# Q[state, action] estimating the long-run reward of taking an action in a
# state, and improves it from experience with the update
#
#     Q[s,a] <- Q[s,a] + lr * ( r + gamma * max_a' Q[s',a'] - Q[s,a] )
#
# It explores with an epsilon-greedy policy (random action with prob. epsilon,
# otherwise greedy) and the exploration rate decays each episode. The value
# heatmap shows max_a Q[s,a]; the arrows show the greedy policy argmax_a Q[s,a].
#
# The environment arrives as the dataset's X: a grid of integer cell codes
#   0 empty . 1 wall . 2 goal (+1) . 3 trap (-1) . 4 start

import numpy as np

# up, right, down, left
ACTIONS = [(-1, 0), (0, 1), (1, 0), (0, -1)]


def run(X, y=None, episodes=60, lr=0.1, gamma=0.95, epsilon=0.3, seed=0):
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
            nr, nc = r, c  # bump into edge or wall -> stay put
        ns = nr * cols + nc
        cell = grid[nr, nc]
        if cell == 2:
            return ns, 1.0, True      # goal
        if cell == 3:
            return ns, -1.0, True     # trap
        return ns, -0.025, False      # small step cost

    def snapshot():
        values = Q.max(axis=1)
        greedy = Q.argmax(axis=1)
        vals, pol = [], []
        for s in range(nS):
            r, c = divmod(s, cols)
            if grid[r, c] in (1, 2, 3):
                vals.append(0.0)
                pol.append(-1)        # walls + terminals have no policy arrow
            else:
                vals.append(float(values[s]))
                pol.append(int(greedy[s]))
        return vals, pol

    Q = np.zeros((nS, nA))
    max_steps = 4 * nS

    yield {
        "type": "rl:init",
        "step": 0,
        "label": "Q-Learning",
        "rows": rows,
        "cols": cols,
        "grid": grid.flatten().tolist(),
        "nActions": nA,
        "explanation": (
            f"Q-Learning on a {rows}\u00d7{cols} gridworld with {nS} states. The agent "
            f"learns a table Q[s,a] of action values by trial and error, reaching the "
            f"goal (+1) while avoiding the trap (-1)."
        ),
        "math": r"Q(s,a)\leftarrow Q(s,a)+\alpha\,[\,r+\gamma\max_{a'}Q(s',a')-Q(s,a)\,]",
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
                a = int(np.argmax(Q[s]))
            ns, r, done = step(s, a)
            target = r if done else r + gamma * float(np.max(Q[ns]))
            Q[s, a] += lr * (target - Q[s, a])
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
            "label": "Q-Learning",
            "episode": ep,
            "values": vals,
            "policy": pol,
            "reward": float(total),
            "steps": len(path) - 1,
            "epsilon": float(eps),
            "path": [int(p) for p in path],
            "explanation": (
                f"Episode {ep}: reward {total:+.2f} in {len(path) - 1} steps "
                f"(\u03b5={eps:.2f}). Brighter cells have higher value; arrows point the way."
            ),
            "math": r"a=\begin{cases}\text{random}&\text{prob }\varepsilon\\ \arg\max_a Q(s,a)&\text{else}\end{cases}",
        }

    vals, pol = snapshot()
    yield {
        "type": "rl:converged",
        "step": int(episodes) + 1,
        "label": "Q-Learning",
        "values": vals,
        "policy": pol,
        "episodes": int(episodes),
        "reason": f"Ran {int(episodes)} episodes; Q-table converged toward the optimal policy.",
        "explanation": (
            "Done. Following the arrows from the start traces the shortest safe path the "
            "agent discovered to the goal."
        ),
        "math": r"\pi^*(s)=\arg\max_a Q^*(s,a)",
    }
