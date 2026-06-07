# Decision Tree (classification, Gini impurity)
#
# Recursively splits the dataset on the (feature, threshold) pair that
# minimizes weighted Gini impurity, until max_depth or min_samples_split.

import numpy as np


def _gini(y, n_classes):
    if len(y) == 0:
        return 0.0
    counts = np.bincount(y, minlength=n_classes)
    p = counts / counts.sum()
    return float(1.0 - np.sum(p * p))


def _class_counts(y, n_classes):
    counts = np.bincount(y, minlength=n_classes)
    return {str(c): int(counts[c]) for c in range(n_classes)}


def _best_split(X, y, n_classes):
    best = {"gain": 0.0, "feature": -1, "threshold": 0.0}
    parent_gini = _gini(y, n_classes)
    n = len(y)
    for f in range(X.shape[1]):
        values = np.unique(X[:, f])
        if len(values) <= 1:
            continue
        thresholds = (values[:-1] + values[1:]) / 2
        for thr in thresholds:
            left_mask = X[:, f] <= thr
            right_mask = ~left_mask
            n_left = int(left_mask.sum())
            n_right = int(right_mask.sum())
            if n_left == 0 or n_right == 0:
                continue
            gini_left = _gini(y[left_mask], n_classes)
            gini_right = _gini(y[right_mask], n_classes)
            weighted = (n_left * gini_left + n_right * gini_right) / n
            gain = parent_gini - weighted
            if gain > best["gain"]:
                best = {
                    "gain": gain,
                    "feature": f,
                    "threshold": float(thr),
                    "gini_left": gini_left,
                    "gini_right": gini_right,
                    "left_mask": left_mask,
                    "right_mask": right_mask,
                }
    return best, parent_gini


def run(X, y, max_depth=4, min_samples_split=4):
    n_classes = int(y.max()) + 1
    next_id = [0]
    total_nodes = [0]
    total_leaves = [0]
    max_depth_reached = [0]

    def make_id():
        i = next_id[0]
        next_id[0] += 1
        return f"n{i}"

    state = {"step": 0}

    def emit(event):
        state["step"] += 1
        event["step"] = state["step"]
        return event

    def node_dict(node_id, parent_id, branch, depth, indices):
        total_nodes[0] += 1
        max_depth_reached[0] = max(max_depth_reached[0], depth)
        sub_y = y[indices]
        return {
            "id": node_id,
            "parentId": parent_id,
            "branch": branch,
            "depth": depth,
            "sampleIndices": indices.tolist(),
            "classCounts": _class_counts(sub_y, n_classes),
            "prediction": None,
            "gini": _gini(sub_y, n_classes),
        }

    stack = []
    root_id = make_id()
    root_indices = np.arange(len(y))
    root = node_dict(root_id, None, None, 0, root_indices)
    stack.append((root_id, root_indices, 0))

    yield emit({
        "type": "dtree:open",
        "node": root,
        "explanation": "Starting from the root: all samples are in one node.",
        "math": r"G(\text{node}) = 1 - \sum_c p_c^2",
    })

    while stack:
        node_id, indices, depth = stack.pop()
        sub_X = X[indices]
        sub_y = y[indices]
        gini = _gini(sub_y, n_classes)
        majority = int(np.bincount(sub_y, minlength=n_classes).argmax())

        if depth >= max_depth or len(indices) < min_samples_split or gini == 0.0:
            total_leaves[0] += 1
            reason = (
                "Pure node" if gini == 0.0
                else "max_depth reached" if depth >= max_depth
                else "too few samples to split"
            )
            yield emit({
                "type": "dtree:leaf",
                "nodeId": node_id,
                "prediction": majority,
                "reason": reason,
                "explanation": f"Leaf at depth {depth}: predict class {majority} ({reason}).",
                "math": rf"\hat y = \arg\max_c |\{{i : y_i = c\}}|",
            })
            continue

        best, parent_gini = _best_split(sub_X, sub_y, n_classes)
        if best["feature"] < 0:
            total_leaves[0] += 1
            yield emit({
                "type": "dtree:leaf",
                "nodeId": node_id,
                "prediction": majority,
                "reason": "No split improved Gini.",
                "explanation": f"Leaf at depth {depth}: predict class {majority}.",
                "math": r"\Delta G \leq 0 \Rightarrow \text{stop}",
            })
            continue

        left_indices = indices[best["left_mask"]]
        right_indices = indices[best["right_mask"]]
        left_id = make_id()
        right_id = make_id()
        left_child = node_dict(left_id, node_id, "left", depth + 1, left_indices)
        right_child = node_dict(right_id, node_id, "right", depth + 1, right_indices)

        yield emit({
            "type": "dtree:split",
            "nodeId": node_id,
            "feature": best["feature"],
            "featureName": f"x[{best['feature']}]",
            "threshold": float(best["threshold"]),
            "giniBefore": parent_gini,
            "giniLeft": best["gini_left"],
            "giniRight": best["gini_right"],
            "leftChild": left_child,
            "rightChild": right_child,
            "explanation": (
                f"Split on feature {best['feature']} at {best['threshold']:.3f}. "
                f"Gini {parent_gini:.3f} -> ({best['gini_left']:.3f}, {best['gini_right']:.3f})."
            ),
            "math": r"\arg\min_{f,t} \frac{N_L}{N} G_L + \frac{N_R}{N} G_R",
        })

        # Push right then left so left is processed first (more intuitive).
        stack.append((right_id, right_indices, depth + 1))
        stack.append((left_id, left_indices, depth + 1))

    yield emit({
        "type": "dtree:done",
        "totalNodes": total_nodes[0],
        "totalLeaves": total_leaves[0],
        "maxDepthReached": max_depth_reached[0],
        "explanation": (
            f"Tree built: {total_nodes[0]} nodes, {total_leaves[0]} leaves, "
            f"max depth {max_depth_reached[0]}."
        ),
        "math": "",
    })
