# Random Forest classifier.
#
# Build T decision stumps/trees on bootstrap samples; predict by majority vote.
# We use shallow trees (max_depth=4) and a random feature subset at each split
# (the "random subspace" trick).

import numpy as np


def _project_2d(X):
    # Deterministic PCA onto the top 2 principal components so >2-D inputs draw
    # a coherent boundary; bootstraps, grid and scatter all share one plane.
    Xc = X - X.mean(axis=0)
    _, S, Vt = np.linalg.svd(Xc, full_matrices=False)
    comps = Vt[:2].copy()
    for i in range(comps.shape[0]):
        if comps[i][np.argmax(np.abs(comps[i]))] < 0:
            comps[i] = -comps[i]
    total = float((S ** 2).sum())
    var = float((S[:2] ** 2).sum() / total) if total > 0 else 0.0
    return Xc @ comps.T, var


class _Node:
    __slots__ = ("feature", "threshold", "left", "right", "prediction")

    def __init__(self):
        self.feature = -1
        self.threshold = 0.0
        self.left = None
        self.right = None
        self.prediction = None


def _gini(y):
    if len(y) == 0:
        return 0.0
    _, counts = np.unique(y, return_counts=True)
    p = counts / len(y)
    return float(1.0 - (p * p).sum())


def _build_tree(X, y, rng, max_depth, max_features, depth=0):
    node = _Node()
    classes, counts = np.unique(y, return_counts=True)
    if len(classes) == 1 or depth >= max_depth or len(y) < 4:
        node.prediction = int(classes[counts.argmax()])
        return node
    n_features = X.shape[1]
    feats = rng.choice(n_features, size=min(max_features, n_features), replace=False)
    best_gain = 0.0
    best_feat = -1
    best_thresh = 0.0
    parent_g = _gini(y)
    for f in feats:
        vals = X[:, f]
        # Sample a handful of thresholds for speed.
        thresholds = np.quantile(vals, np.linspace(0.1, 0.9, 5))
        for t in thresholds:
            mask = vals <= t
            if mask.sum() < 1 or (~mask).sum() < 1:
                continue
            wl = mask.mean()
            gain = parent_g - wl * _gini(y[mask]) - (1 - wl) * _gini(y[~mask])
            if gain > best_gain:
                best_gain = gain
                best_feat = int(f)
                best_thresh = float(t)
    if best_feat == -1:
        node.prediction = int(classes[counts.argmax()])
        return node
    mask = X[:, best_feat] <= best_thresh
    node.feature = best_feat
    node.threshold = best_thresh
    node.left = _build_tree(X[mask], y[mask], rng, max_depth, max_features, depth + 1)
    node.right = _build_tree(X[~mask], y[~mask], rng, max_depth, max_features, depth + 1)
    return node


def _predict_tree(node, x):
    while node.prediction is None:
        node = node.left if x[node.feature] <= node.threshold else node.right
    return node.prediction


def _tree_predict_batch(node, X):
    return np.array([_predict_tree(node, x) for x in X])


def _tree_summary(node):
    nodes = 0
    leaves = 0
    max_depth = 0

    def walk(n, d):
        nonlocal nodes, leaves, max_depth
        nodes += 1
        if n.prediction is not None:
            leaves += 1
            max_depth = max(max_depth, d)
            return
        walk(n.left, d + 1)
        walk(n.right, d + 1)

    walk(node, 0)
    return {"nodes": nodes, "leaves": leaves, "depth": max_depth}


def _grid_predict(X, trees, classes, grid_size=44):
    x_min, x_max = float(X[:, 0].min()) - 0.5, float(X[:, 0].max()) + 0.5
    y_min, y_max = float(X[:, 1].min()) - 0.5, float(X[:, 1].max()) + 0.5
    xs = np.linspace(x_min, x_max, grid_size)
    ys = np.linspace(y_min, y_max, grid_size)
    xx, yy = np.meshgrid(xs, ys)
    grid_pts = np.stack([xx.ravel(), yy.ravel()], axis=1)
    votes = np.zeros((len(grid_pts), len(classes)), dtype=int)
    for t in trees:
        preds = _tree_predict_batch(t, grid_pts)
        for ci, c in enumerate(classes):
            votes[:, ci] += (preds == c).astype(int)
    final = classes[votes.argmax(axis=1)]
    return final.tolist(), grid_size, (x_min, x_max, y_min, y_max)


def run(X, y, n_trees=10, max_depth=4, max_features=2, seed=0):
    rng = np.random.default_rng(seed)
    classes = np.unique(y)

    note = ""
    points = None
    if X.shape[1] > 2:
        n_orig = X.shape[1]
        X, var = _project_2d(X)
        note = f"Projected {n_orig} features onto 2 principal components ({var * 100:.0f}% variance) for a 2-D view. "
        points = X.tolist()

    n = len(X)
    trees = []
    step = 0
    init_event = {
        "type": "forest:tree_grown",
        "step": step,
        "treeIndex": -1,
        "totalTrees": n_trees,
        "treeSummary": {"nodes": 0, "leaves": 0, "depth": 0},
        "ensembleAccuracy": 0.0,
        "explanation": note + f"Starting Random Forest: {n_trees} trees, max depth {max_depth}, "
                       f"{max_features} random features per split.",
        "math": r"\hat y(x) = \mathrm{mode}\{T_t(x)\}_{t=1}^T",
    }
    if points is not None:
        init_event["points"] = points
        init_event["pointAxisLabels"] = ["PC 1", "PC 2"]
    yield init_event

    for t in range(n_trees):
        # Bootstrap sample
        idx = rng.choice(n, size=n, replace=True)
        Xb, yb = X[idx], y[idx]
        tree = _build_tree(Xb, yb, rng, max_depth, max_features)
        trees.append(tree)

        # Ensemble accuracy on the full training set.
        votes = np.zeros((n, len(classes)), dtype=int)
        for tr in trees:
            preds = _tree_predict_batch(tr, X)
            for ci, c in enumerate(classes):
                votes[:, ci] += (preds == c).astype(int)
        ensemble_pred = classes[votes.argmax(axis=1)]
        acc = float((ensemble_pred == y).mean())
        summary = _tree_summary(tree)

        # Emit boundary grid every couple trees to save bandwidth.
        emit_grid = t == 0 or (t + 1) % 3 == 0 or t == n_trees - 1
        extras = {}
        if emit_grid:
            grid, gsize, bbox = _grid_predict(X, trees, classes, grid_size=40)
            extras = {"grid": grid, "gridSize": gsize, "bbox": list(bbox)}

        step += 1
        yield {
            "type": "forest:tree_grown",
            "step": step,
            "iteration": t,
            "treeIndex": t,
            "totalTrees": n_trees,
            "treeSummary": summary,
            "ensembleAccuracy": acc,
            "explanation": (
                f"Tree {t + 1}/{n_trees}: {summary['nodes']} nodes, depth {summary['depth']}. "
                f"Ensemble accuracy = {acc:.3f}."
            ),
            "math": r"T_t \sim \text{Tree}(X^{(t)}, y^{(t)}), \; X^{(t)} \sim \text{Bootstrap}",
            **extras,
        }

    grid, gsize, bbox = _grid_predict(X, trees, classes, grid_size=48)
    step += 1
    yield {
        "type": "forest:converged",
        "step": step,
        "totalTrees": n_trees,
        "finalAccuracy": acc,
        "grid": grid,
        "gridSize": gsize,
        "bbox": list(bbox),
        "reason": f"Grew all {n_trees} trees.",
        "explanation": "Random Forest: bagging + random subspace → strong variance reduction.",
        "math": r"\text{Var}[\hat f] \approx \rho\sigma^2 + \tfrac{1-\rho}{T}\sigma^2",
    }
