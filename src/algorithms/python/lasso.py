# Lasso regression (L1-regularized linear regression) via proximal GD.
#
# Loss = (1/2N) ||y - Xw||² + alpha * ||w_features||_1
# We use the proximal gradient (ISTA): after each GD step on the smooth part,
# apply soft-thresholding to the feature weights — this drives unimportant
# weights exactly to 0 (sparsity).
#
# Emits linreg events so LinRegViz renders the line.

import numpy as np


def _soft_threshold(w, lam):
    return np.sign(w) * np.maximum(np.abs(w) - lam, 0.0)


def run(X, y, alpha=0.4, lr=0.05, epochs=150, seed=0):
    rng = np.random.default_rng(seed)
    n, d = X.shape
    Xa = np.concatenate([np.ones((n, 1)), X], axis=1)
    w = rng.standard_normal(d + 1) * 0.1

    def loss(w):
        resid = Xa @ w - y
        mse = float((resid * resid).sum() / (2 * n))
        reg = float(alpha * np.sum(np.abs(w[1:])))
        return mse + reg

    step = 0
    l0 = loss(w)
    yield {
        "type": "linreg:init",
        "step": step,
        "weights": w.tolist(),
        "loss": l0,
        "explanation": (
            f"Lasso regression with α = {alpha}. L1 penalty produces sparse solutions — "
            f"unimportant features get weights of exactly 0. Initial loss = {l0:.4f}."
        ),
        "math": r"\mathcal{L} = \tfrac{1}{2N}\|y - Xw\|^2 + \alpha\|w_{\text{feat}}\|_1",
    }

    prev_loss = l0
    for it in range(epochs):
        resid = Xa @ w - y
        grad = Xa.T @ resid / n
        # Smooth GD step (L1 not differentiable).
        w_tmp = w - lr * grad
        # Soft-threshold features (preserve bias).
        w = np.concatenate([w_tmp[:1], _soft_threshold(w_tmp[1:], lr * alpha)])
        cur = loss(w)
        zero_count = int((np.abs(w[1:]) < 1e-8).sum())
        step += 1
        yield {
            "type": "linreg:step",
            "step": step,
            "iteration": it,
            "weights": w.tolist(),
            "gradient": grad.tolist(),
            "loss": cur,
            "learningRate": lr,
            "explanation": (
                f"Epoch {it}: loss = {cur:.4f}, {zero_count}/{d} feature weights driven to 0."
            ),
            "math": r"w \leftarrow \mathrm{soft}_{\eta\alpha}\!\left(w - \eta \tfrac{1}{N}X^\top(Xw - y)\right)",
        }
        if abs(prev_loss - cur) < 1e-9:
            step += 1
            yield {
                "type": "linreg:converged",
                "step": step,
                "iteration": it,
                "reason": "Loss change fell below 1e-9.",
                "finalLoss": cur,
                "explanation": "Lasso converged — note how many weights ended at exactly 0.",
                "math": r"\mathrm{soft}_\tau(x) = \mathrm{sign}(x)\max(|x| - \tau, 0)",
            }
            return
        prev_loss = cur

    step += 1
    yield {
        "type": "linreg:converged",
        "step": step,
        "iteration": epochs,
        "reason": f"Reached {epochs}-epoch budget.",
        "finalLoss": cur,
        "explanation": "Lasso done. Try the noisy-multi-feature dataset to see sparsity in action.",
        "math": r"\mathrm{soft}_\tau(x) = \mathrm{sign}(x)\max(|x| - \tau, 0)",
    }
