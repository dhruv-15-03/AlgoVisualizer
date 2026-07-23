# Multi-Layer Perceptron (small NN) for 2D binary classification.
#
# Two hidden layers, choosable activation, softmax output. Trained with batch
# gradient descent on cross-entropy loss.

import numpy as np


def _project_2d(X):
    # Deterministic PCA onto the top 2 principal components so >2-D inputs
    # (e.g. Iris, Wine) train and draw a coherent boundary in one shared plane.
    Xc = X - X.mean(axis=0)
    _, S, Vt = np.linalg.svd(Xc, full_matrices=False)
    comps = Vt[:2].copy()
    for i in range(comps.shape[0]):
        if comps[i][np.argmax(np.abs(comps[i]))] < 0:
            comps[i] = -comps[i]
    total = float((S ** 2).sum())
    var = float((S[:2] ** 2).sum() / total) if total > 0 else 0.0
    return Xc @ comps.T, var


def _softmax(z):
    z = z - z.max(axis=1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=1, keepdims=True)


def _onehot(y, k):
    out = np.zeros((len(y), k))
    out[np.arange(len(y)), y] = 1
    return out


def _activate(z, kind):
    if kind == "relu":
        return np.maximum(0, z)
    if kind == "sigmoid":
        return 1.0 / (1.0 + np.exp(-z))
    return np.tanh(z)  # default


def _activate_grad(h, kind):
    # Returns ∂a/∂z evaluated at the post-activation h.
    if kind == "relu":
        return (h > 0).astype(float)
    if kind == "sigmoid":
        return h * (1 - h)
    return 1 - h ** 2  # tanh


def _forward(X, weights, biases, activation):
    h = X
    activations = [X]
    for i, (W, b) in enumerate(zip(weights, biases)):
        z = h @ W + b
        if i < len(weights) - 1:
            h = _activate(z, activation)
        else:
            h = _softmax(z)
        activations.append(h)
    return activations


def _probe_activations(X, weights, biases, activation, probe_idx=0):
    # Forward pass for a single sample, returned per-layer as a flat list of
    # scalars so the UI can light up each neuron in the network diagram.
    acts = _forward(X[probe_idx:probe_idx + 1], weights, biases, activation)
    return [a[0].tolist() for a in acts]


def _loss_acc(X, y, weights, biases, activation):
    acts = _forward(X, weights, biases, activation)
    probs = acts[-1]
    eps = 1e-12
    loss = float(-np.log(probs[np.arange(len(y)), y] + eps).mean())
    acc = float((probs.argmax(axis=1) == y).mean())
    return loss, acc, acts


def _backward(X, y, weights, biases, acts, k, activation):
    n = len(X)
    Y = _onehot(y, k)
    delta = acts[-1] - Y  # softmax + CE derivative
    grad_w = [None] * len(weights)
    grad_b = [None] * len(biases)
    for i in reversed(range(len(weights))):
        grad_w[i] = acts[i].T @ delta / n
        grad_b[i] = delta.mean(axis=0)
        if i > 0:
            delta = (delta @ weights[i].T) * _activate_grad(acts[i], activation)
    return grad_w, grad_b


def _grid_predict(X, weights, biases, classes, activation, grid_size=44):
    x_min, x_max = float(X[:, 0].min()) - 0.5, float(X[:, 0].max()) + 0.5
    y_min, y_max = float(X[:, 1].min()) - 0.5, float(X[:, 1].max()) + 0.5
    xs = np.linspace(x_min, x_max, grid_size)
    ys = np.linspace(y_min, y_max, grid_size)
    xx, yy = np.meshgrid(xs, ys)
    grid_pts = np.stack([xx.ravel(), yy.ravel()], axis=1)
    probs = _forward(grid_pts, weights, biases, activation)[-1]
    preds = classes[probs.argmax(axis=1)]
    return preds.tolist(), grid_size, (x_min, x_max, y_min, y_max)


def run(X, y, hidden=8, lr=0.1, epochs=80, activation="tanh", seed=0):
    rng = np.random.default_rng(seed)
    classes = np.unique(y)
    k = len(classes)

    note = ""
    points = None
    if X.shape[1] > 2:
        n_orig = X.shape[1]
        X, var = _project_2d(X)
        note = f"Projected {n_orig} features onto 2 principal components ({var * 100:.0f}% variance) for a 2-D view. "
        points = X.tolist()

    layers = [X.shape[1], hidden, hidden, k]
    # He init for relu, Xavier-ish for tanh/sigmoid.
    if activation == "relu":
        weights = [rng.standard_normal((layers[i], layers[i + 1])) * np.sqrt(2.0 / layers[i])
                   for i in range(len(layers) - 1)]
    else:
        weights = [rng.standard_normal((layers[i], layers[i + 1])) * 0.4
                   for i in range(len(layers) - 1)]
    biases = [np.zeros(layers[i + 1]) for i in range(len(layers) - 1)]

    step = 0
    loss, acc, acts = _loss_acc(X, y, weights, biases, activation)
    probe_idx = 0
    init_event = {
        "type": "mlp:init",
        "step": step,
        "layers": layers,
        "weights": [W.tolist() for W in weights],
        "loss": loss,
        "accuracy": acc,
        "sampleActivations": _probe_activations(X, weights, biases, activation, probe_idx),
        "probeIndex": probe_idx,
        "explanation": note + (
            f"Initialized MLP layers {layers}, activation={activation}, softmax output, "
            f"cross-entropy loss. Initial loss={loss:.4f}, acc={acc:.3f}."
        ),
        "math": r"h^{(l)} = \sigma(W^{(l)} h^{(l-1)} + b^{(l)}), \quad p = \mathrm{softmax}(W^{(L)} h^{(L-1)} + b^{(L)})",
    }
    if points is not None:
        init_event["points"] = points
        init_event["pointAxisLabels"] = ["PC 1", "PC 2"]
    yield init_event

    for it in range(epochs):
        loss, acc, acts = _loss_acc(X, y, weights, biases, activation)
        grad_w, grad_b = _backward(X, y, weights, biases, acts, k, activation)
        weights = [W - lr * gW for W, gW in zip(weights, grad_w)]
        biases = [b - lr * gb for b, gb in zip(biases, grad_b)]
        loss, acc, _ = _loss_acc(X, y, weights, biases, activation)
        emit_grid = it == 0 or (it + 1) % 8 == 0 or it == epochs - 1
        extras = {}
        if emit_grid:
            grid, gsize, bbox = _grid_predict(X, weights, biases, classes, activation, grid_size=40)
            extras = {"grid": grid, "gridSize": gsize, "bbox": list(bbox)}
        step += 1
        yield {
            "type": "mlp:step",
            "step": step,
            "iteration": it,
            "layers": layers,
            "weights": [W.tolist() for W in weights],
            "loss": loss,
            "accuracy": acc,
            "learningRate": lr,
            "sampleActivations": _probe_activations(X, weights, biases, activation, probe_idx),
            "probeIndex": probe_idx,
            "explanation": f"Epoch {it}: loss={loss:.4f}, acc={acc:.3f}. Backprop with {activation} activations.",
            "math": r"W \leftarrow W - \eta \, \nabla_W \mathcal{L}",
            **extras,
        }

    step += 1
    yield {
        "type": "mlp:converged",
        "step": step,
        "layers": layers,
        "weights": [W.tolist() for W in weights],
        "finalLoss": loss,
        "finalAccuracy": acc,
        "reason": f"Ran {epochs} epochs of full-batch gradient descent.",
        "explanation": f"Try switching activation (tanh ↔ relu ↔ sigmoid) or widening 'hidden' to see how the boundary changes.",
        "math": r"\text{Universal approximation: any continuous } f \text{ with enough width.}",
    }

