# Agglomerative Hierarchical Clustering (single linkage).
#
# Start with every point as its own cluster, then repeatedly merge the two
# closest clusters until we have `n_clusters` left.
#
# Distance between clusters (single-linkage): minimum pairwise distance between
# any member of each cluster.

import numpy as np


def run(X, y=None, n_clusters=3, seed=0):
    rng = np.random.default_rng(seed)
    _ = rng
    n = len(X)
    # Each point starts in its own cluster.
    cluster_of = np.arange(n)  # cluster id per point
    active = {int(i): [int(i)] for i in range(n)}  # cluster id -> indices
    dist_matrix = np.linalg.norm(X[:, None, :] - X[None, :, :], axis=2)
    np.fill_diagonal(dist_matrix, np.inf)

    step = 0
    yield {
        "type": "cluster:init",
        "step": step,
        "label": f"Hierarchical(k={n_clusters})",
        "explanation": (
            f"Starting with {n} singleton clusters. We'll merge the closest pair "
            f"until {n_clusters} remain."
        ),
        "math": r"d(A, B) = \min_{a \in A, b \in B} \|a - b\|",
    }

    while len(active) > n_clusters:
        # Find min distance between active clusters using single-linkage.
        keys = list(active.keys())
        best = None
        best_d = float("inf")
        for i_idx, a in enumerate(keys):
            for b in keys[i_idx + 1:]:
                # min distance between members of a and members of b
                pa = active[a]
                pb = active[b]
                d = float(dist_matrix[np.ix_(pa, pb)].min())
                if d < best_d:
                    best_d = d
                    best = (a, b)
        if best is None:
            break
        a, b = best
        # Merge b into a.
        active[a] = active[a] + active[b]
        del active[b]
        for pi in active[a]:
            cluster_of[pi] = a
        # Relabel to contiguous ints for the viz.
        remap = {k: i for i, k in enumerate(sorted(active.keys()))}
        labels = np.array([remap[int(c)] for c in cluster_of])
        step += 1
        yield {
            "type": "cluster:merge",
            "step": step,
            "iteration": step - 1,
            "label": f"Hierarchical(k={n_clusters})",
            "labels": labels.tolist(),
            "mergedA": int(a),
            "mergedB": int(b),
            "distance": best_d,
            "numClusters": int(len(active)),
            "explanation": (
                f"Merged the two clusters closest by single-linkage (d = {best_d:.3f}). "
                f"{len(active)} clusters remaining."
            ),
            "math": r"\text{Single-linkage } d(A, B) = \min_{a \in A, b \in B} \|a-b\|",
        }

    # Final relabel.
    remap = {k: i for i, k in enumerate(sorted(active.keys()))}
    final_labels = np.array([remap[int(c)] for c in cluster_of])
    step += 1
    yield {
        "type": "cluster:converged",
        "step": step,
        "label": f"Hierarchical(k={n_clusters})",
        "labels": final_labels.tolist(),
        "numClusters": int(len(active)),
        "reason": f"Reached target of {n_clusters} clusters.",
        "explanation": "Single-linkage tends to produce chain-like clusters — try 'average' linkage for tighter blobs.",
        "math": r"\text{Cut the dendrogram at height that yields k clusters.}",
    }
