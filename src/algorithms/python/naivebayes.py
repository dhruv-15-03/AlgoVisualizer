# Gaussian Naive Bayes (GNB) classifier.
#
# Assumes features within each class follow a Gaussian distribution and are
# conditionally independent. Fitting = compute per-class mean + variance.
# Prediction = argmax over classes of log p(y) + sum log p(x_d | y).

import numpy as np


def _project_2d(X):
    # Deterministic PCA onto the top 2 principal components so >2-D inputs
    # (e.g. Iris, Wine) fit and draw a coherent boundary in one shared plane.
    Xc = X - X.mean(axis=0)
    _, S, Vt = np.linalg.svd(Xc, full_matrices=False)
    comps = Vt[:2].copy()
    for i in range(comps.shape[0]):
        if comps[i][np.argmax(np.abs(comps[i]))] < 0:
            comps[i] = -comps[i]
    total = float((S ** 2).sum())
    var = float((S[:2] ** 2).sum() / total) if total > 0 else 0.0
    return Xc @ comps.T, var


def _log_gaussian(x, mu, var):
    # Diagonal-cov log-pdf per feature; sum across features.
    eps = 1e-6
    var = var + eps
    return -0.5 * np.sum(np.log(2 * np.pi * var) + (x - mu) ** 2 / var, axis=-1)


def _grid_predict(X, classes, means, variances, priors, grid_size=44):
    x_min, x_max = float(X[:, 0].min()) - 0.5, float(X[:, 0].max()) + 0.5
    y_min, y_max = float(X[:, 1].min()) - 0.5, float(X[:, 1].max()) + 0.5
    xs = np.linspace(x_min, x_max, grid_size)
    ys = np.linspace(y_min, y_max, grid_size)
    xx, yy = np.meshgrid(xs, ys)
    grid_pts = np.stack([xx.ravel(), yy.ravel()], axis=1)
    log_post = np.zeros((len(grid_pts), len(classes)))
    for ci, c in enumerate(classes):
        log_post[:, ci] = np.log(priors[ci]) + _log_gaussian(grid_pts, means[ci], variances[ci])
    preds = classes[log_post.argmax(axis=1)]
    return preds.tolist(), grid_size, (x_min, x_max, y_min, y_max)


def run(X, y, smoothing=1e-9, seed=0):
    rng = np.random.default_rng(seed)
    _ = rng
    classes = np.unique(y)

    note = ""
    points = None
    if X.shape[1] > 2:
        n_orig = X.shape[1]
        X, var = _project_2d(X)
        note = f"Projected {n_orig} features onto 2 principal components ({var * 100:.0f}% variance) for a 2-D view. "
        points = X.tolist()

    n_total = len(X)
    means = np.zeros((len(classes), X.shape[1]))
    variances = np.zeros((len(classes), X.shape[1]))
    priors = np.zeros(len(classes))

    step = 0
    init_event = {
        "type": "boundary:init",
        "step": step,
        "label": "Gaussian NB",
        "explanation": note + f"Naive Bayes assumes p(x|y) is Gaussian for each feature. "
                       f"We'll fit {len(classes)} Gaussians, one per class.",
        "math": r"p(y|x) \propto p(y) \prod_d p(x_d \mid y)",
    }
    if points is not None:
        init_event["points"] = points
        init_event["pointAxisLabels"] = ["PC 1", "PC 2"]
    yield init_event

    for ci, c in enumerate(classes):
        Xc = X[y == c]
        means[ci] = Xc.mean(axis=0)
        variances[ci] = Xc.var(axis=0) + smoothing
        priors[ci] = len(Xc) / n_total
        partial = ci + 1 < len(classes)
        grid, gsize, bbox = _grid_predict(
            X,
            classes[: ci + 1] if partial else classes,
            means[: ci + 1] if partial else means,
            variances[: ci + 1] if partial else variances,
            priors[: ci + 1] if partial else priors,
            grid_size=30 if partial else 44,
        )
        step += 1
        yield {
            "type": "boundary:step",
            "step": step,
            "iteration": ci,
            "label": "Gaussian NB",
            "grid": grid,
            "gridSize": gsize,
            "bbox": list(bbox),
            "params": {f"mu_{int(c)}": means[ci].tolist(), f"var_{int(c)}": variances[ci].tolist()},
            "explanation": (
                f"Fitted Gaussian for class {int(c)}: "
                f"μ = ({means[ci][0]:.2f}, {means[ci][1]:.2f}), "
                f"σ² = ({variances[ci][0]:.2f}, {variances[ci][1]:.2f}), "
                f"prior = {priors[ci]:.2f}."
            ),
            "math": r"\mu_c = \frac{1}{N_c} \sum_{i:y_i=c} x_i, \quad \sigma_c^2 = \frac{1}{N_c} \sum_{i:y_i=c} (x_i - \mu_c)^2",
        }

    # Final prediction + accuracy.
    log_post = np.zeros((len(X), len(classes)))
    for ci in range(len(classes)):
        log_post[:, ci] = np.log(priors[ci]) + _log_gaussian(X, means[ci], variances[ci])
    preds = classes[log_post.argmax(axis=1)]
    acc = float((preds == y).mean())
    grid, gsize, bbox = _grid_predict(X, classes, means, variances, priors, grid_size=48)
    step += 1
    yield {
        "type": "boundary:step",
        "step": step,
        "iteration": len(classes),
        "label": "Gaussian NB",
        "grid": grid,
        "gridSize": gsize,
        "bbox": list(bbox),
        "accuracy": acc,
        "explanation": f"All classes fitted. Training accuracy = {acc:.3f}. "
                       f"Decision boundary = points where posteriors tie.",
        "math": r"\hat y = \arg\max_c \log p(y=c) + \sum_d \log p(x_d \mid y=c)",
    }

    step += 1
    yield {
        "type": "boundary:converged",
        "step": step,
        "label": "Gaussian NB",
        "finalAccuracy": acc,
        "reason": "Closed-form: mean and variance per class, no iteration needed.",
        "explanation": "Naive Bayes fits in one pass — no optimization loop.",
        "math": r"\text{Training complexity: } O(n d C)",
    }
