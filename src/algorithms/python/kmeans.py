# K-Means clustering — Lloyd's algorithm
#
# Partition X into k clusters by alternating two steps:
#   1. Assign each point to its nearest centroid.
#   2. Recompute each centroid as the mean of its assigned points.
# Repeat until centroids stop moving (or max_iter is reached).

import numpy as np


def run(X, y=None, k=3, max_iter=20, seed=0, tol=1e-4):
    rng = np.random.default_rng(seed)
    centroids = X[rng.choice(len(X), k, replace=False)].copy()

    step = 0
    yield {
        "type": "kmeans:init",
        "step": step,
        "centroids": centroids.tolist(),
        "explanation": f"Picked {k} random points from X as initial centroids.",
        "math": r"\mu_j^{(0)} = x_{i_j}, \quad i_j \sim \text{Uniform}(1..N)",
    }

    for it in range(max_iter):
        # Step 1: assignment
        dists = np.linalg.norm(X[:, None] - centroids, axis=2)
        labels = dists.argmin(axis=1)
        inertia = float((dists.min(axis=1) ** 2).sum())
        step += 1
        yield {
            "type": "kmeans:assign",
            "step": step,
            "iteration": it,
            "labels": labels.tolist(),
            "inertia": inertia,
            "explanation": f"Iter {it}: each point assigned to its nearest centroid.",
            "math": r"c_i = \arg\min_j \| x_i - \mu_j \|^2",
        }

        # Step 2: update
        new_centroids = np.array([
            X[labels == j].mean(axis=0) if np.any(labels == j) else centroids[j]
            for j in range(k)
        ])
        moved = float(np.linalg.norm(new_centroids - centroids))
        centroids = new_centroids
        step += 1
        yield {
            "type": "kmeans:update",
            "step": step,
            "iteration": it,
            "centroids": centroids.tolist(),
            "moved": moved,
            "inertia": inertia,
            "explanation": f"Iter {it}: centroids moved by {moved:.4f}.",
            "math": r"\mu_j = \frac{1}{|C_j|}\sum_{x \in C_j} x",
        }

        if moved < tol:
            step += 1
            yield {
                "type": "kmeans:converged",
                "step": step,
                "iteration": it,
                "reason": f"Centroid movement {moved:.6f} fell below tol={tol}.",
                "explanation": "K-Means converged — centroids are stable.",
                "math": r"\| \mu^{(t+1)} - \mu^{(t)} \| < \text{tol}",
            }
            return
