# t-SNE — t-distributed Stochastic Neighbor Embedding.
#
# Iteratively places points in 2D such that pairwise similarities in the
# embedding (Student-t in 2D) match similarities in the high-dimensional input
# (Gaussian neighbors with bandwidth tuned by `perplexity`).
#
# This is a teaching implementation: small input only (≤300 points), modest
# iterations, no early exaggeration / momentum tricks beyond the basics.

import numpy as np


def _pairwise_sq_dists(X):
    sum_sq = (X * X).sum(axis=1)
    D = sum_sq[:, None] + sum_sq[None, :] - 2 * X @ X.T
    return np.maximum(D, 0.0)


def _hbeta(D_row, beta):
    P = np.exp(-D_row * beta)
    sumP = max(P.sum(), 1e-12)
    H = np.log(sumP) + beta * (D_row * P).sum() / sumP
    P = P / sumP
    return H, P


def _compute_p(X, perplexity):
    n = len(X)
    D = _pairwise_sq_dists(X)
    P = np.zeros((n, n))
    logU = np.log(perplexity)
    for i in range(n):
        # Binary search for the right beta = 1/(2 sigma^2)
        beta = 1.0
        beta_min = -np.inf
        beta_max = np.inf
        Di = np.delete(D[i], i)
        H, P_i = _hbeta(Di, beta)
        for _ in range(50):
            diff = H - logU
            if abs(diff) < 1e-5:
                break
            if diff > 0:
                beta_min = beta
                beta = beta * 2 if beta_max == np.inf else (beta + beta_max) / 2
            else:
                beta_max = beta
                beta = beta / 2 if beta_min == -np.inf else (beta + beta_min) / 2
            H, P_i = _hbeta(Di, beta)
        full = np.zeros(n)
        full[np.arange(n) != i] = P_i
        P[i] = full
    # Symmetrize.
    P = (P + P.T) / (2 * n)
    return np.maximum(P, 1e-12)


def run(X, y=None, perplexity=20, lr=80.0, n_iter=120, seed=0):
    rng = np.random.default_rng(seed)
    n = len(X)
    # Cap for performance.
    if n > 300:
        idx = rng.choice(n, size=300, replace=False)
        X = X[idx]
        n = 300

    step = 0
    yield {
        "type": "projection:init",
        "step": step,
        "label": f"t-SNE(perp={perplexity})",
        "explanation": (
            f"Computing pairwise similarities P_ij in high-D using Gaussian neighbors with "
            f"perplexity={perplexity}. (May take a moment.)"
        ),
        "math": r"P_{j|i} = \frac{\exp(-\|x_i - x_j\|^2/2\sigma_i^2)}{\sum_{k \ne i}\exp(-\|x_i - x_k\|^2/2\sigma_i^2)}",
    }

    P = _compute_p(X, perplexity)
    Y = rng.standard_normal((n, 2)) * 1e-4
    dY = np.zeros_like(Y)

    for it in range(n_iter):
        D = _pairwise_sq_dists(Y)
        num = 1.0 / (1.0 + D)
        np.fill_diagonal(num, 0.0)
        Q = num / max(num.sum(), 1e-12)
        Q = np.maximum(Q, 1e-12)
        PQ = P - Q
        # Gradient.
        for i in range(n):
            dY[i] = 4 * np.sum((PQ[i] * num[i])[:, None] * (Y[i] - Y), axis=0)
        Y = Y - lr * dY / n
        # Re-center each step.
        Y = Y - Y.mean(axis=0)
        loss = float((P * np.log(P / Q)).sum())
        if it == 0 or (it + 1) % 8 == 0 or it == n_iter - 1:
            step += 1
            yield {
                "type": "projection:step",
                "step": step,
                "iteration": it,
                "label": f"t-SNE(perp={perplexity})",
                "projected": Y.tolist(),
                "loss": loss,
                "explanation": f"Iter {it}: KL(P‖Q) = {loss:.4f}. "
                               f"Each point feels attraction to its high-D neighbors and repulsion from others.",
                "math": r"\nabla_{y_i} = 4 \sum_j (p_{ij} - q_{ij})(y_i - y_j)(1 + \|y_i - y_j\|^2)^{-1}",
            }

    step += 1
    yield {
        "type": "projection:converged",
        "step": step,
        "label": f"t-SNE(perp={perplexity})",
        "projected": Y.tolist(),
        "finalLoss": loss,
        "reason": f"Ran {n_iter} iterations.",
        "explanation": "t-SNE done. Distances between far-apart clusters are NOT meaningful; only local structure is.",
        "math": r"\text{KL}(P\|Q) = \sum_{ij} p_{ij} \log\frac{p_{ij}}{q_{ij}}",
    }
