# Gaussian Mixture Model (GMM) trained via Expectation-Maximization.
#
# Model: each point comes from one of K Gaussians with unknown means, full 2x2
# covariances, and mixing weights pi_k.
#
# E-step: compute responsibility γ_ik = P(z_i = k | x_i)
# M-step: update π_k, μ_k, Σ_k from responsibilities.
#
# We yield 2D covariance summaries as [cx, cy, sxx, sxy, syy] for the ellipse
# renderer.

import numpy as np


def _multivariate_log_pdf(x, mu, cov):
    # x: (n, 2), mu: (2,), cov: (2, 2)
    d = x - mu
    inv = np.linalg.pinv(cov + 1e-6 * np.eye(2))
    det = float(np.linalg.det(cov + 1e-6 * np.eye(2)))
    quad = np.einsum("ni,ij,nj->n", d, inv, d)
    return -0.5 * (2 * np.log(2 * np.pi) + np.log(max(det, 1e-12)) + quad)


def run(X, y=None, k=3, max_iter=30, seed=0, tol=1e-4):
    rng = np.random.default_rng(seed)
    n = len(X)
    # Init: pick k random points as means.
    idx = rng.choice(n, size=k, replace=False)
    means = X[idx].copy()
    covs = np.array([np.eye(2) * np.var(X, axis=0).mean() for _ in range(k)])
    pis = np.full(k, 1.0 / k)

    def cov_summary():
        return [[float(means[i, 0]), float(means[i, 1]),
                 float(covs[i, 0, 0]), float(covs[i, 0, 1]), float(covs[i, 1, 1])]
                for i in range(k)]

    step = 0
    yield {
        "type": "cluster:init",
        "step": step,
        "label": f"GMM(k={k})",
        "explanation": (
            f"GMM with k={k}: fits {k} 2D Gaussians + mixing weights via EM. "
            f"Initialized means at random data points; covariances start spherical."
        ),
        "math": r"p(x) = \sum_{k=1}^K \pi_k \, \mathcal{N}(x | \mu_k, \Sigma_k)",
    }

    prev_ll = -np.inf
    for it in range(max_iter):
        # E-step
        log_resp = np.zeros((n, k))
        for j in range(k):
            log_resp[:, j] = np.log(pis[j] + 1e-12) + _multivariate_log_pdf(X, means[j], covs[j])
        # log-sum-exp for normalization
        m = log_resp.max(axis=1, keepdims=True)
        norm = m + np.log(np.exp(log_resp - m).sum(axis=1, keepdims=True))
        log_ll = float(norm.sum())
        resp = np.exp(log_resp - norm)

        # Assign hard labels for viz coloring (just argmax of responsibility).
        labels = resp.argmax(axis=1)

        # M-step
        Nk = resp.sum(axis=0)
        for j in range(k):
            if Nk[j] < 1e-8:
                continue
            means[j] = (resp[:, j, None] * X).sum(axis=0) / Nk[j]
            diff = X - means[j]
            covs[j] = (resp[:, j, None, None] * np.einsum("ni,nj->nij", diff, diff)).sum(axis=0) / Nk[j]
        pis = Nk / n
        step += 1
        yield {
            "type": "cluster:step",
            "step": step,
            "iteration": it,
            "label": f"GMM(k={k})",
            "labels": labels.tolist(),
            "centers": means.tolist(),
            "covariances": cov_summary(),
            "metric": log_ll,
            "metricLabel": "Log-likelihood",
            "explanation": (
                f"EM iter {it}: log-likelihood = {log_ll:.2f}. "
                f"E-step assigns soft responsibilities; M-step refits μ, Σ, π."
            ),
            "math": r"\gamma_{ik} = \frac{\pi_k \mathcal{N}(x_i|\mu_k, \Sigma_k)}{\sum_j \pi_j \mathcal{N}(x_i|\mu_j, \Sigma_j)}",
        }
        if abs(log_ll - prev_ll) < tol:
            step += 1
            yield {
                "type": "cluster:converged",
                "step": step,
                "iteration": it,
                "label": f"GMM(k={k})",
                "labels": labels.tolist(),
                "numClusters": int(k),
                "reason": f"Log-likelihood change ({abs(log_ll - prev_ll):.2e}) below tol.",
                "explanation": "EM converged. Ellipses show the learned covariance shapes.",
                "math": r"\Sigma_k = \frac{1}{N_k}\sum_i \gamma_{ik}(x_i-\mu_k)(x_i-\mu_k)^\top",
            }
            return
        prev_ll = log_ll

    step += 1
    yield {
        "type": "cluster:converged",
        "step": step,
        "label": f"GMM(k={k})",
        "labels": labels.tolist(),
        "numClusters": int(k),
        "reason": f"Reached max_iter = {max_iter}.",
        "explanation": "Done. Each ellipse = 2σ contour of a learned Gaussian component.",
        "math": r"\mu_k = \frac{1}{N_k}\sum_i \gamma_{ik} x_i",
    }
