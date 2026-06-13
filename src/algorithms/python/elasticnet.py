# ElasticNet regression — linear regression with a blended L1 + L2 penalty.
#
# Loss = (1/2N) ||y - Xw||^2 + alpha * [ l1_ratio * ||w_feat||_1
#                                        + (1 - l1_ratio) * 0.5 * ||w_feat||^2 ]
# The bias term w[0] is never penalized. ElasticNet keeps Lasso's sparsity while
# staying stable when features are correlated (Ridge's strength).
#
# We emit linreg:* events so the standard LinRegViz renders the fit + loss curve.

import numpy as np


def run(X, y, alpha=0.5, l1_ratio=0.5, lr=0.05, epochs=120, seed=0):
    rng = np.random.default_rng(seed)
    n, d = X.shape
    Xa = np.concatenate([np.ones((n, 1)), X], axis=1)
    w = rng.standard_normal(d + 1) * 0.1

    def loss(w):
        resid = Xa @ w - y
        mse = float((resid * resid).sum() / (2 * n))
        l1 = float(np.abs(w[1:]).sum())
        l2 = float(w[1:] @ w[1:])
        reg = float(alpha * (l1_ratio * l1 + (1 - l1_ratio) * 0.5 * l2))
        return mse + reg

    step = 0
    l0 = loss(w)
    yield {
        "type": "linreg:init",
        "step": step,
        "weights": w.tolist(),
        "loss": l0,
        "explanation": (
            f"ElasticNet with \u03b1 = {alpha}, L1 ratio = {l1_ratio}. It mixes Lasso (sparsity) "
            f"and Ridge (stability). Initial loss = {l0:.4f}."
        ),
        "math": r"\mathcal{L} = \tfrac{1}{2N}\|y - Xw\|^2 + \alpha\!\left[\rho\|w\|_1 + \tfrac{1-\rho}{2}\|w\|_2^2\right]",
    }

    prev_loss = l0
    cur = l0
    for it in range(int(epochs)):
        resid = Xa @ w - y
        grad = Xa.T @ resid / n
        # Blended penalty on feature weights only (skip bias at index 0).
        grad[1:] += alpha * (l1_ratio * np.sign(w[1:]) + (1 - l1_ratio) * w[1:])
        w = w - lr * grad
        cur = loss(w)
        n_zero = int((np.abs(w[1:]) < 1e-3).sum())
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
                f"Epoch {it}: loss = {cur:.4f}. L1 drives weak weights to exactly 0 "
                f"({n_zero}/{d} near-zero), L2 keeps the rest small."
            ),
            "math": r"w \leftarrow w - \eta\!\left[\tfrac{1}{N}X^\top(Xw - y) + \alpha(\rho\,\mathrm{sign}(w) + (1-\rho)w)\right]",
        }
        if abs(prev_loss - cur) < 1e-9:
            step += 1
            yield {
                "type": "linreg:converged",
                "step": step,
                "iteration": it,
                "reason": "Loss change fell below 1e-9.",
                "finalLoss": cur,
                "explanation": "ElasticNet converged. Push L1 ratio toward 1 for a sparser model.",
                "math": r"\rho = 1 \Rightarrow \text{Lasso}, \quad \rho = 0 \Rightarrow \text{Ridge}",
            }
            return
        prev_loss = cur

    step += 1
    yield {
        "type": "linreg:converged",
        "step": step,
        "iteration": int(epochs),
        "reason": f"Reached {epochs}-epoch budget.",
        "finalLoss": cur,
        "explanation": "Done. Try L1 ratio = 1.0 (pure Lasso) or 0.0 (pure Ridge) to compare.",
        "math": r"\rho = 1 \Rightarrow \text{Lasso}, \quad \rho = 0 \Rightarrow \text{Ridge}",
    }
