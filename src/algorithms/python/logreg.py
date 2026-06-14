# Logistic Regression via batch gradient descent (binary classification)
#
# Model:    p_hat = sigmoid(X @ w_features + b)        (b = w[0])
# Loss:     L = -(1/N) * sum( y log(p_hat) + (1-y) log(1-p_hat) )
# Update:   w <- w - lr * dL/dw  with  dL/dw = (1/N) X^T (p_hat - y)

import numpy as np


def _project_2d(X):
    # Insurance: a future 2-class but >2-D dataset still draws a coherent
    # boundary line by projecting onto the top 2 principal components.
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


def run(X, y, lr=0.1, epochs=100, seed=0):
    rng = np.random.default_rng(seed)

    note = ""
    points = None
    if X.shape[1] > 2:
        n_orig = X.shape[1]
        X, var = _project_2d(X)
        note = f"Projected {n_orig} features onto 2 principal components ({var * 100:.0f}% variance) for a 2-D view. "
        points = X.tolist()

    n, d = X.shape
    Xa = np.concatenate([np.ones((n, 1)), X], axis=1)
    w = rng.standard_normal(d + 1) * 0.1

    def loss_and_acc(weights):
        p = _sigmoid(Xa @ weights)
        eps = 1e-12
        loss = float(-(y * np.log(p + eps) + (1 - y) * np.log(1 - p + eps)).mean())
        acc = float(((p >= 0.5).astype(int) == y).mean())
        return loss, acc

    step = 0
    loss, acc = loss_and_acc(w)
    init_event = {
        "type": "logreg:init",
        "step": step,
        "weights": w.tolist(),
        "loss": loss,
        "accuracy": acc,
        "explanation": note + "Initialized weights randomly. Sigmoid maps the linear score to a probability.",
        "math": r"\hat p = \sigma(w^\top x) = \frac{1}{1 + e^{-w^\top x}}",
    }
    if points is not None:
        init_event["points"] = points
        init_event["pointAxisLabels"] = ["PC 1", "PC 2"]
    yield init_event

    prev_loss = loss
    for it in range(epochs):
        p = _sigmoid(Xa @ w)
        grad = (Xa.T @ (p - y)) / n
        w = w - lr * grad
        loss, acc = loss_and_acc(w)
        step += 1
        yield {
            "type": "logreg:step",
            "step": step,
            "iteration": it,
            "weights": w.tolist(),
            "gradient": grad.tolist(),
            "loss": loss,
            "accuracy": acc,
            "learningRate": lr,
            "explanation": f"Epoch {it}: loss = {loss:.4f}, accuracy = {acc:.3f}.",
            "math": r"w \leftarrow w - \eta \, \frac{1}{N} X^\top (\hat p - y)",
        }
        if abs(prev_loss - loss) < 1e-8:
            step += 1
            yield {
                "type": "logreg:converged",
                "step": step,
                "iteration": it,
                "reason": "Loss change fell below 1e-8.",
                "finalLoss": loss,
                "finalAccuracy": acc,
                "explanation": "Gradient descent converged.",
                "math": r"|L^{(t+1)} - L^{(t)}| < \varepsilon",
            }
            return
        prev_loss = loss
