# Ridge regression (L2-regularized linear regression).
#
# Loss = (1/2N) ||y - Xw||² + (alpha/2) ||w_features||²   (bias not regularized)
# Update: w ← w - lr * [ X^T(Xw - y)/N + alpha * w_features ]
#
# We emit linreg events so the standard LinRegViz renders the line + loss.

import numpy as np


def run(X, y, alpha=0.5, lr=0.05, epochs=120, seed=0):
    rng = np.random.default_rng(seed)
    n, d = X.shape
    Xa = np.concatenate([np.ones((n, 1)), X], axis=1)
    w = rng.standard_normal(d + 1) * 0.1

    def loss(w):
        resid = Xa @ w - y
        mse = float((resid * resid).sum() / (2 * n))
        reg = float(0.5 * alpha * (w[1:] @ w[1:]))
        return mse + reg

    step = 0
    l0 = loss(w)
    yield {
        "type": "linreg:init",
        "step": step,
        "weights": w.tolist(),
        "loss": l0,
        "explanation": (
            f"Ridge regression with α = {alpha}. The L2 penalty shrinks weights toward 0, "
            f"trading a bit of bias for much lower variance. Initial loss = {l0:.4f}."
        ),
        "math": r"\mathcal{L} = \tfrac{1}{2N} \|y - Xw\|^2 + \tfrac{\alpha}{2}\|w_{\text{feat}}\|^2",
    }

    prev_loss = l0
    for it in range(epochs):
        resid = Xa @ w - y
        grad = Xa.T @ resid / n
        # L2 penalty on feature weights only (skip bias at index 0).
        grad[1:] += alpha * w[1:]
        w = w - lr * grad
        cur = loss(w)
        step += 1
        yield {
            "type": "linreg:step",
            "step": step,
            "iteration": it,
            "weights": w.tolist(),
            "gradient": grad.tolist(),
            "loss": cur,
            "learningRate": lr,
            "explanation": f"Epoch {it}: loss = {cur:.4f}. "
                           f"L2 penalty pulls each weight toward 0 by α·w each step.",
            "math": r"w \leftarrow w - \eta \left[\tfrac{1}{N}X^\top(Xw - y) + \alpha w\right]",
        }
        if abs(prev_loss - cur) < 1e-9:
            step += 1
            yield {
                "type": "linreg:converged",
                "step": step,
                "iteration": it,
                "reason": "Loss change fell below 1e-9.",
                "finalLoss": cur,
                "explanation": "Ridge converged. Increase α to see weights shrink more.",
                "math": r"\hat w = (X^\top X + \alpha I)^{-1} X^\top y",
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
        "explanation": "Ridge done — try α = 5.0 to see strong shrinkage.",
        "math": r"\hat w = (X^\top X + \alpha I)^{-1} X^\top y",
    }
