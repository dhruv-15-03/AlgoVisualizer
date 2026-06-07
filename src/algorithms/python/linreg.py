# Linear Regression via batch gradient descent
#
# Model:    y_hat = X @ w_features + b   (b = w[0], features = w[1:])
# Loss:     L = (1 / 2N) * sum( (y_hat - y)^2 )
# Update:   w <- w - lr * dL/dw

import numpy as np


def run(X, y, lr=0.05, epochs=80, seed=0):
    rng = np.random.default_rng(seed)
    n, d = X.shape
    # Augment X with bias column of 1s so w[0] is the intercept.
    Xa = np.concatenate([np.ones((n, 1)), X], axis=1)
    w = rng.standard_normal(d + 1) * 0.1

    def loss_of(weights):
        pred = Xa @ weights
        return float(((pred - y) ** 2).mean() / 2)

    step = 0
    yield {
        "type": "linreg:init",
        "step": step,
        "weights": w.tolist(),
        "loss": loss_of(w),
        "explanation": "Initialized weights to small random values.",
        "math": r"w \sim \mathcal{N}(0, 0.1^2)",
    }

    prev_loss = loss_of(w)
    for it in range(epochs):
        pred = Xa @ w
        error = pred - y
        grad = (Xa.T @ error) / n
        w = w - lr * grad
        loss = loss_of(w)
        step += 1
        yield {
            "type": "linreg:step",
            "step": step,
            "iteration": it,
            "weights": w.tolist(),
            "gradient": grad.tolist(),
            "loss": loss,
            "learningRate": lr,
            "explanation": f"Epoch {it}: loss = {loss:.4f}.",
            "math": r"w \leftarrow w - \eta \, \frac{1}{N} X^\top (Xw - y)",
        }
        if abs(prev_loss - loss) < 1e-8:
            step += 1
            yield {
                "type": "linreg:converged",
                "step": step,
                "iteration": it,
                "reason": "Loss change fell below 1e-8.",
                "finalLoss": loss,
                "explanation": "Gradient descent converged.",
                "math": r"|L^{(t+1)} - L^{(t)}| < \varepsilon",
            }
            return
        prev_loss = loss
