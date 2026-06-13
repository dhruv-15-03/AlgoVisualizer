# Autoencoder for dimensionality reduction.
#
# A tiny neural net learns to reconstruct its own input through a 2-D
# bottleneck:  X -> [encoder] -> z (2-D) -> [decoder] -> X_hat.
# Minimizing reconstruction error forces z to keep the most informative
# structure, so the bottleneck activations z become a learned 2-D embedding —
# a non-linear cousin of PCA.
#
# We emit projection:* events (z is the projection, MSE is the loss curve) so
# the standard ProjectionViz renders it.

import numpy as np


def run(X, y=None, lr=0.05, epochs=160, seed=0):
    rng = np.random.default_rng(seed)
    X = np.asarray(X, dtype=float)
    n, d = X.shape

    # Standardize so features on different scales train stably.
    mu = X.mean(axis=0)
    sd = X.std(axis=0)
    sd[sd < 1e-8] = 1.0
    Xs = (X - mu) / sd

    h = 2  # bottleneck width — fixed at 2 so the embedding is plottable.
    W1 = rng.standard_normal((d, h)) * 0.3
    b1 = np.zeros(h)
    W2 = rng.standard_normal((h, d)) * 0.3
    b2 = np.zeros(d)

    def forward(A):
        z_pre = A @ W1 + b1
        z = np.tanh(z_pre)          # bottleneck activation = the 2-D embedding
        out = z @ W2 + b2
        return z_pre, z, out

    def mse():
        _, _, out = forward(Xs)
        return float(((out - Xs) ** 2).mean())

    step = 0
    l0 = mse()
    yield {
        "type": "projection:init",
        "step": step,
        "label": "Autoencoder(2D)",
        "explanation": (
            f"Autoencoder on {n}\u00d7{d} data. An encoder squeezes each point through a 2-D "
            f"bottleneck, then a decoder rebuilds it. Initial reconstruction MSE = {l0:.4f}."
        ),
        "math": r"\hat x = g(f(x)),\quad \min \; \|x - \hat x\|^2",
    }

    for it in range(int(epochs)):
        z_pre, z, out = forward(Xs)
        # Loss = mean over all entries of (out - Xs)^2.
        d_out = 2.0 * (out - Xs) / (n * d)
        dW2 = z.T @ d_out
        db2 = d_out.sum(axis=0)
        dz = d_out @ W2.T
        dz_pre = dz * (1.0 - z ** 2)      # tanh'
        dW1 = Xs.T @ dz_pre
        db1 = dz_pre.sum(axis=0)

        W2 -= lr * dW2
        b2 -= lr * db2
        W1 -= lr * dW1
        b1 -= lr * db1

        # Emit the embedding periodically so the scatter animates without flooding.
        if it == 0 or (it + 1) % 8 == 0 or it == int(epochs) - 1:
            _, z_now, _ = forward(Xs)
            cur = mse()
            step += 1
            yield {
                "type": "projection:step",
                "step": step,
                "iteration": it,
                "label": "Autoencoder(2D)",
                "projected": z_now.tolist(),
                "loss": cur,
                "explanation": (
                    f"Epoch {it}: reconstruction MSE = {cur:.4f}. The bottleneck activations "
                    f"are rearranging themselves to preserve as much structure as possible."
                ),
                "math": r"z = \tanh(W_1 x + b_1) \in \mathbb{R}^2",
            }

    _, z_final, _ = forward(Xs)
    final = mse()
    step += 1
    yield {
        "type": "projection:converged",
        "step": step,
        "label": "Autoencoder(2D)",
        "projected": z_final.tolist(),
        "finalLoss": final,
        "reason": f"Trained {epochs} epochs; final MSE = {final:.4f}.",
        "explanation": (
            "Done. Unlike PCA's straight axes, the autoencoder can bend its embedding to "
            "untangle non-linear structure. Lower MSE = more faithful 2-D summary."
        ),
        "math": r"z \text{ is a non-linear analogue of the PCA projection}",
    }
