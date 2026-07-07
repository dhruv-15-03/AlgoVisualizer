# Multi-head scaled dot-product self-attention over a small token sequence.
#
# X is a [n_tokens, d_model] matrix of toy token embeddings (deterministic,
# seeded per-word — see src/lib/toy-embeddings.ts). Every head gets its own
# random-but-seeded Wq/Wk/Wv projection (standing in for a trained
# transformer's *learned* weights), runs scaled dot-product attention
# independently, and the per-head outputs are concatenated and passed through
# an output projection Wo — exactly the "MultiHead(Q,K,V) = Concat(head_1,
# ..., head_h)Wo" mechanism from Vaswani et al. (2017), minus the training.

import json
import numpy as np


def _softmax(z):
    z = z - z.max(axis=-1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=-1, keepdims=True)


def run(X, y=None, tokens_json="[]", d_k=4, n_heads=2, seed=0, scale=1, causal=0):
    tokens = json.loads(tokens_json)
    rng = np.random.default_rng(int(seed))
    n, d_model = X.shape
    d_k = max(1, min(int(d_k), d_model))
    n_heads = max(1, min(int(n_heads), 8))

    proj_scale = 1.0 / np.sqrt(d_model)
    Wq = [rng.standard_normal((d_model, d_k)) * proj_scale for _ in range(n_heads)]
    Wk = [rng.standard_normal((d_model, d_k)) * proj_scale for _ in range(n_heads)]
    Wv = [rng.standard_normal((d_model, d_k)) * proj_scale for _ in range(n_heads)]
    Wo = rng.standard_normal((n_heads * d_k, d_model)) * (1.0 / np.sqrt(n_heads * d_k))

    Qh = [X @ Wq[h] for h in range(n_heads)]
    Kh = [X @ Wk[h] for h in range(n_heads)]
    Vh = [X @ Wv[h] for h in range(n_heads)]

    step = 0
    heads_note = (
        f"Each of the {n_heads} heads gets its own Wq/Wk/Wv, so it can learn to attend "
        "to a different kind of relationship (e.g. one head tracks adjacent words, "
        "another tracks subject-verb agreement) — this is exactly why real "
        "transformers use multiple heads instead of one wide one."
        if n_heads > 1
        else "A single head: one Wq/Wk/Wv projection, one attention pattern."
    )
    yield {
        "type": "attention:init",
        "step": step,
        "tokens": tokens,
        "dModel": int(d_model),
        "dK": int(d_k),
        "nHeads": int(n_heads),
        "headsQ": [q.tolist() for q in Qh],
        "headsK": [k.tolist() for k in Kh],
        "headsV": [v.tolist() for v in Vh],
        "explanation": (
            f"Projected {n} token embeddings (d_model={d_model}) into Query, Key and "
            f"Value spaces of size d_k={d_k}, independently for each of {n_heads} "
            f"head(s). {heads_note}"
        ),
        "math": r"Q_h = XW_Q^{(h)},\quad K_h = XW_K^{(h)},\quad V_h = XW_V^{(h)}",
    }

    scores_h = [Qh[h] @ Kh[h].T for h in range(n_heads)]
    step += 1
    yield {
        "type": "attention:step",
        "step": step,
        "stage": "scores",
        "headMatrices": [s.tolist() for s in scores_h],
        "explanation": (
            "Raw attention scores per head: the dot product of every query with every "
            "key. A larger dot product means the two vectors point in a more similar "
            "direction — the model reads this as \u201cmore relevant.\u201d Switch heads "
            "below — each one computes a completely independent score matrix."
        ),
        "math": r"\text{scores}^{(h)}_{ij} = q^{(h)}_i \cdot k^{(h)}_j",
    }

    if scale:
        scaled_h = [s / np.sqrt(d_k) for s in scores_h]
    else:
        scaled_h = [s.copy() for s in scores_h]
    step += 1
    if scale:
        scale_note = (
            f"Scaled every score by 1/\u221a{d_k} \u2248 {1 / np.sqrt(d_k):.3f} so dot "
            "products don't grow with d_k and push softmax into a near-one-hot, "
            "hard-to-train regime."
        )
        math_scaled = r"\text{scaled}^{(h)} = \dfrac{Q_hK_h^\top}{\sqrt{d_k}}"
    else:
        scale_note = (
            "Scaling is OFF for this run \u2014 compare how much peakier softmax gets "
            "as you raise d_k without it. This is exactly why \u201cscaled\u201d "
            "dot-product attention scales by 1/\u221ad_k."
        )
        math_scaled = r"\text{scaled}^{(h)} = Q_hK_h^\top"
    yield {
        "type": "attention:step",
        "step": step,
        "stage": "scaled",
        "headMatrices": [s.tolist() for s in scaled_h],
        "explanation": scale_note,
        "math": math_scaled,
    }

    masked_h = list(scaled_h)
    if causal:
        mask = np.triu(np.ones((n, n), dtype=bool), k=1)
        masked_h = [np.where(mask, -1e9, m) for m in masked_h]

    weights_h = [_softmax(m) for m in masked_h]
    step += 1
    causal_note = (
        " Causal masking blocks each token from attending to future tokens (the "
        "GPT-style decoder trick that makes autoregressive generation possible), "
        "applied identically across all heads."
        if causal
        else ""
    )
    yield {
        "type": "attention:step",
        "step": step,
        "stage": "softmax",
        "headMatrices": [w.tolist() for w in weights_h],
        "explanation": (
            "Softmax turns each row into a probability distribution over which "
            "tokens to attend to \u2014 every row sums to 1, independently per head." + causal_note
        ),
        "math": r"A^{(h)} = \mathrm{softmax}(\text{scaled}^{(h)})",
    }

    outputs_h = [weights_h[h] @ Vh[h] for h in range(n_heads)]
    concat = np.concatenate(outputs_h, axis=-1) if n_heads > 1 else outputs_h[0]
    output = concat @ Wo
    step += 1
    concat_note = (
        f" Concatenating all {n_heads} heads' outputs gives a {n_heads * d_k}-wide "
        f"vector, which the output projection Wo mixes back down to d_model={d_model} "
        "so this block's output can be added residually to its input."
        if n_heads > 1
        else " With one head, Wo just reprojects the single head's output back to d_model."
    )
    yield {
        "type": "attention:converged",
        "step": step,
        "headWeights": [w.tolist() for w in weights_h],
        "headOutputs": [o.tolist() for o in outputs_h],
        "concatOutput": concat.tolist(),
        "output": output.tolist(),
        "reason": "Computed each head's weighted sum of Value vectors, concatenated, and projected with Wo.",
        "explanation": (
            "Each head's output row is a blend of that head's Value vectors, weighted "
            "by how much its query attends to each key \u2014 a different "
            "\u201cview\u201d of the sentence per head." + concat_note
        ),
        "math": r"\text{MultiHead}(Q,K,V) = \mathrm{Concat}(\text{head}_1,\ldots,\text{head}_h)W_O",
    }
