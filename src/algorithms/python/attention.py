# Scaled dot-product self-attention over a small token sequence.
#
# X is a [n_tokens, d_model] matrix of toy token embeddings (deterministic,
# seeded per-word — see src/lib/toy-embeddings.ts). Q/K/V projection matrices
# are random but seeded, standing in for the *learned* weights a trained
# transformer would have. The mechanism — score, scale, softmax, weight V —
# is exactly what a real transformer's attention head does.

import json
import numpy as np


def _softmax(z):
    z = z - z.max(axis=-1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=-1, keepdims=True)


def run(X, y=None, tokens_json="[]", d_k=4, seed=0, scale=1, causal=0):
    tokens = json.loads(tokens_json)
    rng = np.random.default_rng(int(seed))
    n, d_model = X.shape
    d_k = max(1, min(int(d_k), d_model))

    init_scale = 1.0 / np.sqrt(d_model)
    Wq = rng.standard_normal((d_model, d_k)) * init_scale
    Wk = rng.standard_normal((d_model, d_k)) * init_scale
    Wv = rng.standard_normal((d_model, d_k)) * init_scale

    Q = X @ Wq
    K = X @ Wk
    V = X @ Wv

    step = 0
    yield {
        "type": "attention:init",
        "step": step,
        "tokens": tokens,
        "dModel": int(d_model),
        "dK": int(d_k),
        "Q": Q.tolist(),
        "K": K.tolist(),
        "V": V.tolist(),
        "explanation": (
            f"Projected {n} token embeddings (d_model={d_model}) into Query, Key and "
            f"Value spaces of size d_k={d_k}, using three random projection matrices "
            "Wq, Wk, Wv. A trained transformer learns these matrices; here they're "
            "fixed (seeded) so you can study the mechanism in isolation."
        ),
        "math": r"Q = XW_Q,\quad K = XW_K,\quad V = XW_V",
    }

    scores = Q @ K.T
    step += 1
    yield {
        "type": "attention:step",
        "step": step,
        "stage": "scores",
        "scores": scores.tolist(),
        "explanation": (
            "Raw attention scores: the dot product of every query with every key. "
            "A larger dot product means the two vectors point in a more similar "
            "direction — the model reads this as \u201cmore relevant.\u201d"
        ),
        "math": r"\text{scores}_{ij} = q_i \cdot k_j",
    }

    if scale:
        scaled = scores / np.sqrt(d_k)
    else:
        scaled = scores.copy()
    step += 1
    if scale:
        scale_note = (
            f"Scaled every score by 1/\u221a{d_k} \u2248 {1 / np.sqrt(d_k):.3f} so dot "
            "products don't grow with d_k and push softmax into a near-one-hot, "
            "hard-to-train regime."
        )
        math_scaled = r"\text{scaled} = \dfrac{QK^\top}{\sqrt{d_k}}"
    else:
        scale_note = (
            "Scaling is OFF for this run \u2014 compare how much peakier softmax gets "
            "as you raise d_k without it. This is exactly why \u201cscaled\u201d "
            "dot-product attention scales by 1/\u221ad_k."
        )
        math_scaled = r"\text{scaled} = QK^\top"
    yield {
        "type": "attention:step",
        "step": step,
        "stage": "scaled",
        "scores": scaled.tolist(),
        "explanation": scale_note,
        "math": math_scaled,
    }

    masked = scaled.copy()
    if causal:
        mask = np.triu(np.ones((n, n), dtype=bool), k=1)
        masked = np.where(mask, -1e9, masked)

    weights = _softmax(masked)
    step += 1
    causal_note = (
        " Causal masking blocks each token from attending to future tokens (the "
        "GPT-style decoder trick that makes autoregressive generation possible)."
        if causal
        else ""
    )
    yield {
        "type": "attention:step",
        "step": step,
        "stage": "softmax",
        "scores": weights.tolist(),
        "explanation": (
            "Softmax turns each row into a probability distribution over which "
            "tokens to attend to \u2014 every row sums to 1." + causal_note
        ),
        "math": r"A = \mathrm{softmax}(\text{scaled})",
    }

    output = weights @ V
    step += 1
    yield {
        "type": "attention:converged",
        "step": step,
        "weights": weights.tolist(),
        "output": output.tolist(),
        "reason": "Computed the weighted sum of Value vectors using the attention weights.",
        "explanation": (
            "Each output row is a blend of all Value vectors, weighted by how much "
            "that query attends to each key. This contextualized vector \u2014 not "
            "the original embedding \u2014 is what a transformer layer passes onward."
        ),
        "math": r"\text{Attention}(Q,K,V) = AV",
    }
