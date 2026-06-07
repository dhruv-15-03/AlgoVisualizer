# K-Nearest Neighbors (KNN) classifier.
#
# Lazy learner: no training, just memorize. To classify a new point, find its
# k nearest neighbors in the training set and take a majority vote.
#
# We emit one boundary:step per "phase":
#   1. init     — k chosen, dataset memorized.
#   2. compute  — emit the prediction grid (the decision boundary).
#   3. done.

import numpy as np


def _grid_predict(X, y, k, grid_size=44):
    x_min, x_max = float(X[:, 0].min()) - 0.5, float(X[:, 0].max()) + 0.5
    y_min, y_max = float(X[:, 1].min()) - 0.5, float(X[:, 1].max()) + 0.5
    xs = np.linspace(x_min, x_max, grid_size)
    ys = np.linspace(y_min, y_max, grid_size)
    xx, yy = np.meshgrid(xs, ys)
    grid_pts = np.stack([xx.ravel(), yy.ravel()], axis=1)
    # Distance from each grid point to every training point.
    diff = grid_pts[:, None, :] - X[None, :, :]
    dist = np.linalg.norm(diff, axis=2)
    nn_idx = np.argpartition(dist, kth=min(k, len(X) - 1), axis=1)[:, :k]
    nn_labels = y[nn_idx]
    classes = np.unique(y)
    preds = np.zeros(len(grid_pts), dtype=int)
    for i, row in enumerate(nn_labels):
        # majority vote
        counts = np.array([(row == c).sum() for c in classes])
        preds[i] = int(classes[counts.argmax()])
    return preds.tolist(), grid_size, (x_min, x_max, y_min, y_max)


def run(X, y, k=5, seed=0):
    rng = np.random.default_rng(seed)
    _ = rng  # KNN has no randomness; seed is just for the slider UX.
    classes = np.unique(y)
    step = 0
    yield {
        "type": "boundary:init",
        "step": step,
        "label": f"KNN(k={k})",
        "explanation": f"KNN memorized {len(X)} training points with k={k} neighbors. "
                       f"There's nothing to fit — classification happens at query time.",
        "math": r"\hat y(x) = \mathrm{mode}\{ y_i : i \in \mathcal{N}_k(x) \}",
    }

    # Just a couple of intermediate frames so the timeline feels animated.
    for frac in [0.4, 0.7, 1.0]:
        gs = max(20, int(40 * frac))
        grid, gsize, bbox = _grid_predict(X, y, k, grid_size=gs)
        train_pred = np.array([
            classes[np.bincount(y[np.argsort(np.linalg.norm(X - xq, axis=1))[:k]]).argmax()]
            for xq in X
        ])
        acc = float((train_pred == y).mean())
        step += 1
        yield {
            "type": "boundary:step",
            "step": step,
            "iteration": int(frac * 10),
            "label": f"KNN(k={k})",
            "grid": grid,
            "gridSize": gsize,
            "bbox": list(bbox),
            "accuracy": acc,
            "explanation": (
                f"Computed predictions for a {gsize}×{gsize} grid of points. "
                f"Each grid cell is colored by the majority class of its {k} nearest training neighbors. "
                f"Training accuracy: {acc:.3f}."
            ),
            "math": r"\hat y(x) = \arg\max_c \sum_{i \in \mathcal{N}_k(x)} \mathbf{1}[y_i = c]",
        }

    step += 1
    yield {
        "type": "boundary:converged",
        "step": step,
        "label": f"KNN(k={k})",
        "finalAccuracy": acc,
        "reason": "KNN is non-parametric — there's no convergence loop.",
        "explanation": "Done. Try editing k in the code: small k = jagged boundary, large k = smooth.",
        "math": r"\text{No iterative training; complexity at predict: } O(n d)",
    }
