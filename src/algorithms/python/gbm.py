# Gradient Boosting (binary classification) with shallow regression-tree stumps.
#
# Boost the log-odds F(x): start from the prior log-odds, then repeatedly fit a
# regression stump to the pseudo-residuals r = y - sigmoid(F) (the negative
# gradient of log loss) and add a shrunken step F <- F + lr * stump(x).
# Probability = sigmoid(F).
#
# Emits boundary:* events so the standard decision-boundary viz renders it.

import numpy as np


def _project_2d(X):
    # Deterministic PCA onto the top 2 principal components so >2-D inputs draw
    # a coherent boundary; training, grid and scatter all share the same plane.
    Xc = X - X.mean(axis=0)
    _, S, Vt = np.linalg.svd(Xc, full_matrices=False)
    comps = Vt[:2].copy()
    for i in range(comps.shape[0]):
        if comps[i][np.argmax(np.abs(comps[i]))] < 0:
            comps[i] = -comps[i]
    total = float((S ** 2).sum())
    var = float((S[:2] ** 2).sum() / total) if total > 0 else 0.0
    return Xc @ comps.T, var


def _sigmoid(z):
    return 1.0 / (1.0 + np.exp(-np.clip(z, -30, 30)))


def _fit_stump(X, r):
    # Best single axis-aligned split minimizing squared error to residuals r.
    n, d = X.shape
    best = None
    for f in range(d):
        xs = X[:, f]
        thresholds = np.unique(np.quantile(xs, np.linspace(0.1, 0.9, 9)))
        for t in thresholds:
            left = xs <= t
            n_left = int(left.sum())
            if n_left == 0 or n_left == n:
                continue
            lval = float(r[left].mean())
            rval = float(r[~left].mean())
            pred = np.where(left, lval, rval)
            sse = float(((r - pred) ** 2).sum())
            if best is None or sse < best[0]:
                best = (sse, f, float(t), lval, rval)
    if best is None:
        m = float(r.mean())
        return (0, 0.0, m, m)
    _, f, t, lval, rval = best
    return (f, t, lval, rval)


def _stump_predict(stump, X):
    f, t, lval, rval = stump
    return np.where(X[:, f] <= t, lval, rval)


def _grid_predict(stumps, F0, lr, X, grid_size=44):
    x_min, x_max = float(X[:, 0].min()) - 0.5, float(X[:, 0].max()) + 0.5
    y_min, y_max = float(X[:, 1].min()) - 0.5, float(X[:, 1].max()) + 0.5
    xs = np.linspace(x_min, x_max, grid_size)
    ys = np.linspace(y_min, y_max, grid_size)
    xx, yy = np.meshgrid(xs, ys)
    pts = np.stack([xx.ravel(), yy.ravel()], axis=1)
    scores = np.full(pts.shape[0], F0)
    for s in stumps:
        scores = scores + lr * _stump_predict(s, pts)
    preds = (_sigmoid(scores) >= 0.5).astype(int)
    return preds.tolist(), grid_size, (x_min, x_max, y_min, y_max)


def run(X, y, n_estimators=30, lr=0.1, seed=0):
    rng = np.random.default_rng(seed)
    _ = rng  # GBM with full-data stumps is deterministic; seed kept for UX.

    note = ""
    points = None
    if X.shape[1] > 2:
        n_orig = X.shape[1]
        X, var = _project_2d(X)
        note = f"Projected {n_orig} features onto 2 principal components ({var * 100:.0f}% variance) for a 2-D view. "
        points = X.tolist()

    n, d = X.shape
    yb = (np.asarray(y) > 0).astype(float)
    p0 = float(np.clip(yb.mean(), 1e-6, 1 - 1e-6))
    F0 = float(np.log(p0 / (1 - p0)))
    F = np.full(n, F0)
    stumps = []

    def loss_acc():
        p = _sigmoid(F)
        eps = 1e-9
        ll = float(-(yb * np.log(p + eps) + (1 - yb) * np.log(1 - p + eps)).mean())
        acc = float(((p >= 0.5).astype(float) == yb).mean())
        return ll, acc

    step = 0
    l0, a0 = loss_acc()
    init_event = {
        "type": "boundary:init",
        "step": step,
        "label": f"GBM(n={n_estimators})",
        "explanation": note + (
            f"Start from the prior log-odds F\u2080 = {F0:.3f} \u2014 every point predicts the "
            f"majority rate. Each round fits a tree to the residuals. loss={l0:.4f}, acc={a0:.3f}."
        ),
        "math": r"F_0(x) = \log\frac{\bar y}{1-\bar y}",
    }
    if points is not None:
        init_event["points"] = points
        init_event["pointAxisLabels"] = ["PC 1", "PC 2"]
    yield init_event

    for it in range(int(n_estimators)):
        p = _sigmoid(F)
        residual = yb - p  # negative gradient of log loss
        stump = _fit_stump(X, residual)
        stumps.append(stump)
        F = F + lr * _stump_predict(stump, X)
        loss, acc = loss_acc()

        emit_grid = it == 0 or (it + 1) % 5 == 0 or it == int(n_estimators) - 1
        extras = {}
        if emit_grid:
            grid, gsize, bbox = _grid_predict(stumps, F0, lr, X, 44)
            extras = {"grid": grid, "gridSize": gsize, "bbox": list(bbox)}

        step += 1
        axis = ["x\u2081", "x\u2082"][stump[0]] if d >= 2 and stump[0] < 2 else f"x{stump[0]}"
        yield {
            "type": "boundary:step",
            "step": step,
            "iteration": it,
            "label": f"GBM(n={n_estimators})",
            "loss": loss,
            "accuracy": acc,
            "explanation": (
                f"Tree {it + 1}: split on {axis} \u2264 {stump[1]:.2f}, added \u03b7\u00b7tree to F. "
                f"loss={loss:.4f}, acc={acc:.3f}."
            ),
            "math": r"F_m = F_{m-1} + \eta\, h_m(x),\ \ h_m \approx y - \sigma(F_{m-1})",
            **extras,
        }

    final_loss, final_acc = loss_acc()
    step += 1
    yield {
        "type": "boundary:converged",
        "step": step,
        "label": f"GBM(n={n_estimators})",
        "finalAccuracy": final_acc,
        "reason": f"Boosted {n_estimators} stumps at learning rate {lr}.",
        "explanation": (
            f"Final ensemble of {n_estimators} trees \u2014 acc={final_acc:.3f}. More trees or a "
            f"higher learning rate fit harder; watch for overfitting on noisy data."
        ),
        "math": r"\hat y = \mathbb{1}\!\left[\sigma(F_M(x)) \ge 0.5\right]",
    }
