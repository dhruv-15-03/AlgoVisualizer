# Principal Component Analysis.
#
# 1. Center X.
# 2. Compute covariance matrix.
# 3. Eigendecompose; keep top n_components.
# 4. Project.
#
# We animate by gradually projecting onto progressively more components — but
# since PCA is closed-form, we yield 3-4 frames: covariance computed, components
# found, projection done.

import numpy as np


def run(X, y=None, n_components=2, seed=0):
    rng = np.random.default_rng(seed)
    _ = rng
    Xc = X - X.mean(axis=0)
    n, d = Xc.shape

    step = 0
    yield {
        "type": "projection:init",
        "step": step,
        "label": f"PCA(n_components={n_components})",
        "explanation": (
            f"PCA on {n}×{d} data. Step 1: center each feature so it has mean 0."
        ),
        "math": r"X_c = X - \bar X",
    }

    cov = Xc.T @ Xc / max(n - 1, 1)
    step += 1
    yield {
        "type": "projection:step",
        "step": step,
        "iteration": 0,
        "label": f"PCA(n_components={n_components})",
        # No projection yet — emit a tiny placeholder so the bottom panel shows the
        # variance bars once we compute them.
        "projected": Xc[:, :2].tolist() if d >= 2 else np.concatenate([Xc, np.zeros((n, 1))], axis=1).tolist(),
        "explanation": f"Computed the {d}×{d} covariance matrix Σ. PCA finds the directions of "
                       f"maximum variance — these are the eigenvectors of Σ.",
        "math": r"\Sigma = \tfrac{1}{N-1} X_c^\top X_c",
    }

    # Eigendecompose (symmetric → use eigh for real eigenvalues).
    vals, vecs = np.linalg.eigh(cov)
    order = np.argsort(vals)[::-1]
    vals = vals[order]
    vecs = vecs[:, order]
    top = vecs[:, :n_components]
    proj = Xc @ top
    # Pad to 2D if user picked n_components=1 (avoid viz crash).
    if proj.shape[1] < 2:
        proj = np.concatenate([proj, np.zeros((n, 2 - proj.shape[1]))], axis=1)
    var_explained = (vals[:n_components] / vals.sum()).tolist()

    step += 1
    yield {
        "type": "projection:step",
        "step": step,
        "iteration": 1,
        "label": f"PCA(n_components={n_components})",
        "projected": proj.tolist(),
        "varianceExplained": var_explained,
        "explanation": (
            f"Projected onto the top {n_components} eigenvectors. "
            f"They explain {sum(var_explained) * 100:.1f}% of total variance."
        ),
        "math": r"Z = X_c V_{1:k}, \quad V \text{ eigenvectors of } \Sigma",
    }

    step += 1
    yield {
        "type": "projection:converged",
        "step": step,
        "label": f"PCA(n_components={n_components})",
        "projected": proj.tolist(),
        "varianceExplained": var_explained,
        "reason": "Closed-form eigendecomposition — no iteration.",
        "explanation": "PCA done. The bottom chart shows variance explained per component.",
        "math": r"\text{Reconstruction error} = \sum_{k > n_c} \lambda_k",
    }
