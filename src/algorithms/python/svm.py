# Linear Support Vector Machine via sub-gradient descent on hinge loss.
#
#   loss = (1/N) Σ max(0, 1 - y_i (w·x_i + b)) + (lambda/2) ||w||²
#   y in {-1, +1}
#
# At each step we compute the sub-gradient of the hinge loss and take a small
# step. Support vectors = points lying on or inside the margin.

import numpy as np


def _project_2d(X):
    # Insurance: a future 2-class but >2-D dataset still draws a coherent
    # boundary by projecting onto the top 2 principal components (deterministic).
    Xc = X - X.mean(axis=0)
    _, S, Vt = np.linalg.svd(Xc, full_matrices=False)
    comps = Vt[:2].copy()
    for i in range(comps.shape[0]):
        if comps[i][np.argmax(np.abs(comps[i]))] < 0:
            comps[i] = -comps[i]
    total = float((S ** 2).sum())
    var = float((S[:2] ** 2).sum() / total) if total > 0 else 0.0
    return Xc @ comps.T, var


def _grid_predict(X, w, b, grid_size=44):
    x_min, x_max = float(X[:, 0].min()) - 0.5, float(X[:, 0].max()) + 0.5
    y_min, y_max = float(X[:, 1].min()) - 0.5, float(X[:, 1].max()) + 0.5
    xs = np.linspace(x_min, x_max, grid_size)
    ys = np.linspace(y_min, y_max, grid_size)
    xx, yy = np.meshgrid(xs, ys)
    grid_pts = np.stack([xx.ravel(), yy.ravel()], axis=1)
    scores = grid_pts @ w + b
    preds = (scores >= 0).astype(int)
    return preds.tolist(), grid_size, (x_min, x_max, y_min, y_max)


def run(X, y, lr=0.05, C=1.0, epochs=80, seed=0):
    rng = np.random.default_rng(seed)
    # SVM uses {-1, +1} labels.
    y_signed = np.where(y > 0, 1.0, -1.0)

    note = ""
    points = None
    if X.shape[1] > 2:
        n_orig = X.shape[1]
        X, var = _project_2d(X)
        note = f"Projected {n_orig} features onto 2 principal components ({var * 100:.0f}% variance) for a 2-D view. "
        points = X.tolist()

    n, d = X.shape
    w = rng.standard_normal(d) * 0.01
    b = 0.0
    lam = 1.0 / max(C, 1e-6)

    def loss_acc(w, b):
        margins = 1 - y_signed * (X @ w + b)
        hinge = np.maximum(0, margins).mean()
        reg = 0.5 * lam * float(np.dot(w, w))
        preds = (X @ w + b >= 0).astype(int)
        return float(hinge + reg), float((preds == y).mean())

    step = 0
    l0, a0 = loss_acc(w, b)
    init_event = {
        "type": "boundary:init",
        "step": step,
        "label": f"SVM(C={C})",
        "explanation": note + (
            f"Initialized w randomly. The SVM minimizes the hinge loss with L2 regularization. "
            f"Initial loss = {l0:.4f}, accuracy = {a0:.3f}."
        ),
        "math": r"\min_w \tfrac{1}{N}\sum_i \max(0, 1 - y_i (w^\top x_i + b)) + \tfrac{\lambda}{2}\|w\|^2",
    }
    if points is not None:
        init_event["points"] = points
        init_event["pointAxisLabels"] = ["PC 1", "PC 2"]
    yield init_event

    for it in range(epochs):
        margins = y_signed * (X @ w + b)
        mask = margins < 1  # active (violating) constraints
        # Sub-gradient
        grad_w = lam * w - (1.0 / n) * (X[mask].T @ y_signed[mask] if mask.any() else np.zeros(d))
        grad_b = -(1.0 / n) * y_signed[mask].sum() if mask.any() else 0.0
        w = w - lr * grad_w
        b = b - lr * grad_b
        loss, acc = loss_acc(w, b)
        # Support vectors = points on/inside the margin
        sv_idx = np.where((y_signed * (X @ w + b)) <= 1.001)[0]
        # Send the boundary grid every few steps to save bandwidth.
        emit_grid = it == 0 or (it + 1) % 8 == 0 or it == epochs - 1
        if emit_grid:
            grid, gsize, bbox = _grid_predict(X, w, b, grid_size=44)
            extras = {"grid": grid, "gridSize": gsize, "bbox": list(bbox)}
        else:
            extras = {}
        step += 1
        yield {
            "type": "boundary:step",
            "step": step,
            "iteration": it,
            "label": f"SVM(C={C})",
            "loss": loss,
            "accuracy": acc,
            "supportVectors": sv_idx.tolist(),
            "params": {"w": w.tolist(), "b": float(b)},
            "explanation": (
                f"Epoch {it}: loss={loss:.4f}, acc={acc:.3f}, "
                f"{len(sv_idx)} support vectors on or inside the margin."
            ),
            "math": r"w \leftarrow w - \eta \left[ \lambda w - \tfrac{1}{N}\sum_{i:margin<1} y_i x_i \right]",
            **extras,
        }

    grid, gsize, bbox = _grid_predict(X, w, b, grid_size=48)
    step += 1
    yield {
        "type": "boundary:step",
        "step": step,
        "iteration": epochs,
        "label": f"SVM(C={C})",
        "loss": loss,
        "accuracy": acc,
        "supportVectors": sv_idx.tolist(),
        "grid": grid,
        "gridSize": gsize,
        "bbox": list(bbox),
        "explanation": "Final fit. Yellow rings = support vectors.",
        "math": r"\hat y(x) = \mathrm{sign}(w^\top x + b)",
    }

    step += 1
    yield {
        "type": "boundary:converged",
        "step": step,
        "label": f"SVM(C={C})",
        "finalAccuracy": acc,
        "reason": f"Ran {epochs} sub-gradient epochs.",
        "explanation": "Try increasing C (less regularization) — the margin tightens but may overfit.",
        "math": r"\text{Higher } C \Rightarrow \text{smaller } \lambda \Rightarrow \text{tighter fit}",
    }
