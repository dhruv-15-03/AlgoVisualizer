# Convolutional Neural Network — tiny end-to-end image classifier.
#
# Architecture:
#   Input (12x12) → Conv(n_filters × 3×3) → ReLU → MaxPool(2×2) → Dense → Softmax
#
# Trained on the "shapes" dataset (horizontal / vertical / diagonal stripes).
# Pure numpy — forward, backward, SGD all written from scratch so you can see
# how a CNN actually learns spatial filters.

import numpy as np


def _softmax(z):
    z = z - z.max(axis=1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=1, keepdims=True)


def _conv_forward(X_img, F):
    """X_img: (n, H, W); F: (n_filters, kh, kw)  →  (n, oh, ow, n_filters)."""
    n, H, W = X_img.shape
    nf, kh, kw = F.shape
    oh, ow = H - kh + 1, W - kw + 1
    patches = np.zeros((n, oh, ow, kh * kw), dtype=X_img.dtype)
    for a in range(kh):
        for b in range(kw):
            patches[:, :, :, a * kw + b] = X_img[:, a:a + oh, b:b + ow]
    F_flat = F.reshape(nf, kh * kw).T  # (kh*kw, nf)
    return patches @ F_flat  # (n, oh, ow, nf)


def _conv_backward_filters(X_img, dout, F):
    """Returns gradient wrt filters only (we don't backprop into the image)."""
    n, _, _ = X_img.shape
    nf, kh, kw = F.shape
    oh, ow = dout.shape[1], dout.shape[2]
    dF = np.zeros_like(F)
    for a in range(kh):
        for b in range(kw):
            patch = X_img[:, a:a + oh, b:b + ow]  # (n, oh, ow)
            # dF[f, a, b] = mean over (n, i, j) of dout[n, i, j, f] * patch[n, i, j]
            dF[:, a, b] = np.einsum('nijf,nij->f', dout, patch) / n
    return dF


def _maxpool_forward(X, k=2):
    """X: (n, H, W, C)  →  pooled (n, oh, ow, C) + mask (n, H, W, C)."""
    n, H, W, C = X.shape
    oh, ow = H // k, W // k
    H2, W2 = oh * k, ow * k
    X_trim = X[:, :H2, :W2, :]
    # Reshape to (n, oh, k, ow, k, C) then permute pool dims adjacent.
    blocks = X_trim.reshape(n, oh, k, ow, k, C).transpose(0, 1, 3, 2, 4, 5)
    flat = blocks.reshape(n, oh, ow, k * k, C)
    out = flat.max(axis=3)
    argmax = flat.argmax(axis=3)
    mask_flat = np.zeros_like(flat)
    np.put_along_axis(mask_flat, argmax[:, :, :, None, :], 1.0, axis=3)
    mask = mask_flat.reshape(n, oh, ow, k, k, C).transpose(0, 1, 3, 2, 4, 5).reshape(n, H2, W2, C)
    if H2 < H or W2 < W:
        full_mask = np.zeros((n, H, W, C))
        full_mask[:, :H2, :W2, :] = mask
        mask = full_mask
    return out, mask


def _maxpool_backward(dout, mask, k=2):
    """Distribute dout to the positions selected by the mask."""
    dout_up = np.repeat(np.repeat(dout, k, axis=1), k, axis=2)
    # Pad if mask is larger
    n, H, W, C = mask.shape
    if dout_up.shape[1] < H or dout_up.shape[2] < W:
        pad = np.zeros((n, H, W, C))
        pad[:, :dout_up.shape[1], :dout_up.shape[2], :] = dout_up
        dout_up = pad
    return mask * dout_up


def _forward(X_img, F, W2, b2):
    conv = _conv_forward(X_img, F)
    conv_relu = np.maximum(0, conv)
    pool, mask = _maxpool_forward(conv_relu, k=2)
    flat = pool.reshape(pool.shape[0], -1)
    logits = flat @ W2 + b2
    probs = _softmax(logits)
    return conv, conv_relu, pool, mask, probs


def _loss_acc(probs, y):
    eps = 1e-12
    loss = float(-np.log(probs[np.arange(len(y)), y] + eps).mean())
    acc = float((probs.argmax(axis=1) == y).mean())
    return loss, acc


def _backward(X_img, y, F, W2, conv, conv_relu, pool, mask, probs):
    n = len(y)
    n_classes = probs.shape[1]
    Y = np.zeros_like(probs)
    Y[np.arange(n), y] = 1
    dlogits = (probs - Y) / n
    flat = pool.reshape(n, -1)
    dW2 = flat.T @ dlogits
    db2 = dlogits.sum(axis=0)
    dflat = dlogits @ W2.T
    dpool = dflat.reshape(pool.shape)
    dconv_relu = _maxpool_backward(dpool, mask, k=2)
    dconv = dconv_relu * (conv > 0).astype(float)
    dF = _conv_backward_filters(X_img, dconv, F)
    return dF, dW2, db2


def run(X, y, n_filters=4, lr=0.15, epochs=30, seed=0):
    n = X.shape[0]
    size = int(np.sqrt(X.shape[1]))
    X_img = X.reshape(n, size, size)
    y = y.astype(int)
    classes = np.unique(y)
    n_classes = len(classes)

    rng = np.random.default_rng(seed)
    kh, kw = 3, 3
    F = rng.standard_normal((n_filters, kh, kw)) * 0.3
    pool_h = (size - kh + 1) // 2
    pool_w = (size - kw + 1) // 2
    W2 = rng.standard_normal((pool_h * pool_w * n_filters, n_classes)) * 0.2
    b2 = np.zeros(n_classes)

    # Pick one sample per class for visualization
    sample_idx = []
    for cls in classes:
        cls_pool = np.where(y == cls)[0]
        if len(cls_pool) > 0:
            sample_idx.append(int(cls_pool[0]))

    conv, conv_relu, pool, mask, probs = _forward(X_img, F, W2, b2)
    loss, acc = _loss_acc(probs, y)

    yield {
        "type": "cnn:init",
        "step": 0,
        "filters": F.tolist(),
        "filterSize": [kh, kw],
        "imageShape": [size, size],
        "sampleInputs": [X_img[i].tolist() for i in sample_idx],
        "sampleLabels": [int(y[i]) for i in sample_idx],
        "sampleFeatureMaps": [conv_relu[i].tolist() for i in sample_idx],
        "samplePredictions": [probs[i].tolist() for i in sample_idx],
        "loss": loss,
        "accuracy": acc,
        "explanation": (
            f"CNN initialized: {n_filters} random 3×3 filters → ReLU → 2×2 max-pool → "
            f"dense({pool_h * pool_w * n_filters}→{n_classes}). "
            f"Initial loss={loss:.3f}, acc={acc:.3f}."
        ),
        "math": r"\mathrm{conv}(I)_{i,j,f} = \sum_{a,b} F_{a,b,f} \, I_{i+a,\,j+b}",
    }

    for it in range(epochs):
        conv, conv_relu, pool, mask, probs = _forward(X_img, F, W2, b2)
        dF, dW2, db2 = _backward(X_img, y, F, W2, conv, conv_relu, pool, mask, probs)
        F -= lr * dF
        W2 -= lr * dW2
        b2 -= lr * db2
        conv, conv_relu, pool, mask, probs = _forward(X_img, F, W2, b2)
        loss, acc = _loss_acc(probs, y)

        emit_maps = it < 3 or (it + 1) % 4 == 0 or it == epochs - 1
        extras = {}
        if emit_maps:
            extras = {
                "sampleFeatureMaps": [conv_relu[i].tolist() for i in sample_idx],
                "samplePredictions": [probs[i].tolist() for i in sample_idx],
            }

        yield {
            "type": "cnn:step",
            "step": it + 1,
            "iteration": it,
            "filters": F.tolist(),
            "loss": loss,
            "accuracy": acc,
            "learningRate": lr,
            "explanation": (
                f"Epoch {it}: loss={loss:.4f}, acc={acc:.3f}. "
                f"Filters slide over the image; gradient pushes each one toward "
                f"detecting the pattern its samples need most."
            ),
            "math": r"F \leftarrow F - \eta \, \nabla_F \mathcal{L}",
            **extras,
        }

    yield {
        "type": "cnn:converged",
        "step": epochs + 1,
        "filters": F.tolist(),
        "sampleFeatureMaps": [conv_relu[i].tolist() for i in sample_idx],
        "samplePredictions": [probs[i].tolist() for i in sample_idx],
        "finalLoss": loss,
        "finalAccuracy": acc,
        "reason": f"Completed {epochs} epochs of SGD.",
        "explanation": (
            "Inspect the learned filters: with a stripe dataset, they typically "
            "resemble horizontal / vertical / diagonal edge detectors — exactly "
            "the discriminative features the network needed."
        ),
        "math": r"\text{Filters are learned, not hand-designed.}",
    }
