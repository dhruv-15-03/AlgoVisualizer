# Polynomial regression via batch gradient descent.
#
# Expands a 1-D input x into [1, x, x², …, x^degree] then fits weights
# w = [a_0, a_1, …, a_d] by minimizing (1/2N) Σ (y_i - p(x_i))^2.

import numpy as np


def _poly_features(x, degree):
    return np.stack([x ** k for k in range(degree + 1)], axis=1)


def run(X, y, degree=3, lr=0.02, epochs=120, seed=0):
    rng = np.random.default_rng(seed)
    x = X[:, 0]
    Phi = _poly_features(x, degree)
    n = len(y)
    # Light init — large random weights blow up x^d quickly.
    w = rng.standard_normal(degree + 1) * 0.01

    def loss(w):
        return float(((Phi @ w - y) ** 2).sum() / (2 * n))

    step = 0
    l0 = loss(w)
    yield {
        "type": "polyreg:init",
        "step": step,
        "weights": w.tolist(),
        "degree": degree,
        "loss": l0,
        "explanation": (
            f"Fitting a polynomial of degree {degree}. We expand x → [1, x, x², …, x^{degree}] "
            f"and learn coefficients via gradient descent. Initial loss = {l0:.4f}."
        ),
        "math": r"\hat y = \sum_{k=0}^{d} a_k x^k",
    }

    prev_loss = l0
    for it in range(epochs):
        grad = Phi.T @ (Phi @ w - y) / n
        # Clip to keep high-degree gradients sane.
        grad = np.clip(grad, -10, 10)
        w = w - lr * grad
        cur = loss(w)
        step += 1
        yield {
            "type": "polyreg:step",
            "step": step,
            "iteration": it,
            "weights": w.tolist(),
            "degree": degree,
            "loss": cur,
            "learningRate": lr,
            "explanation": f"Epoch {it}: loss = {cur:.4f}. "
                           f"Coefficients: {', '.join(f'{a:.2f}' for a in w)}.",
            "math": r"\nabla_a \mathcal{L} = \tfrac{1}{N}\Phi^\top(\Phi a - y)",
        }
        if abs(prev_loss - cur) < 1e-9:
            break
        prev_loss = cur

    step += 1
    yield {
        "type": "polyreg:converged",
        "step": step,
        "weights": w.tolist(),
        "degree": degree,
        "finalLoss": cur,
        "reason": "Gradient descent converged or reached epoch budget.",
        "explanation": "Try degree=1 (line) or degree=8 (overfit) to see bias/variance trade-off.",
        "math": r"\text{Higher degree} \Rightarrow \text{lower bias, higher variance}",
    }
