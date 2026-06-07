# DBSCAN — density-based spatial clustering with noise.
#
# Two parameters:
#   eps      : radius of the neighborhood
#   min_pts  : minimum points in eps-ball to be a "core" point
#
# Algorithm: for each unvisited point, find its eps-neighbors. If it's a core
# point, start a new cluster and expand by recursively adding all density-
# reachable neighbors. Non-core points reachable from a core get the cluster
# label; isolated points get label -1 (noise).

import numpy as np


def run(X, y=None, eps=0.5, min_pts=5, seed=0):
    rng = np.random.default_rng(seed)
    _ = rng
    n = len(X)
    labels = np.full(n, -1, dtype=int)  # -1 = unvisited/noise
    cluster_id = 0
    # Precompute neighbors.
    dist = np.linalg.norm(X[:, None, :] - X[None, :, :], axis=2)
    neighbors = [np.where(row <= eps)[0].tolist() for row in dist]

    step = 0
    yield {
        "type": "cluster:init",
        "step": step,
        "label": f"DBSCAN(eps={eps}, min_pts={min_pts})",
        "explanation": (
            f"DBSCAN with eps={eps}, min_pts={min_pts}. We expand clusters from 'core' points "
            f"(those with ≥{min_pts} neighbors within distance {eps})."
        ),
        "math": r"\text{Core: } |\mathcal{N}_\epsilon(x)| \ge \text{min\_pts}",
    }

    visited = np.zeros(n, dtype=bool)
    for i in range(n):
        if visited[i]:
            continue
        visited[i] = True
        nb = neighbors[i]
        if len(nb) < min_pts:
            # noise (for now — may be picked up by another cluster's expansion)
            continue
        # Start a new cluster.
        labels[i] = cluster_id
        seed_set = list(nb)
        ptr = 0
        while ptr < len(seed_set):
            q = seed_set[ptr]
            ptr += 1
            if not visited[q]:
                visited[q] = True
                nq = neighbors[q]
                if len(nq) >= min_pts:
                    for r in nq:
                        if r not in seed_set:
                            seed_set.append(r)
            if labels[q] == -1:
                labels[q] = cluster_id
        # Emit a snapshot after each cluster expansion.
        cluster_id += 1
        num = int(cluster_id)
        noise = int((labels == -1).sum())
        step += 1
        yield {
            "type": "cluster:step",
            "step": step,
            "iteration": cluster_id - 1,
            "label": f"DBSCAN(eps={eps}, min_pts={min_pts})",
            "labels": labels.tolist(),
            "metric": float(noise),
            "metricLabel": "Noise points",
            "explanation": (
                f"Found cluster {cluster_id - 1}. So far: {num} clusters, {noise} noise points."
            ),
            "math": r"\text{Cluster grows via density-reachability through core points.}",
        }

    noise = int((labels == -1).sum())
    step += 1
    yield {
        "type": "cluster:converged",
        "step": step,
        "label": f"DBSCAN(eps={eps}, min_pts={min_pts})",
        "labels": labels.tolist(),
        "numClusters": int(cluster_id),
        "reason": f"Visited every point. Found {cluster_id} clusters and {noise} noise points.",
        "explanation": "DBSCAN doesn't need k. It finds clusters of arbitrary shape and ignores outliers.",
        "math": r"\text{Output: } \{C_1, \ldots, C_k\} \cup \text{noise}",
    }
