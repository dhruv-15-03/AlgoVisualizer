/**
 * Deterministic "toy" token embeddings for the attention visualizer.
 *
 * These are NOT trained embeddings (no GloVe/word2vec/BERT here) — they're
 * seeded pseudo-random unit vectors keyed by the token's lowercased text, so:
 *
 *   - the same word always gets the same vector for a given seed, so repeated
 *     words in a sentence ("the ... the") visibly attend to each other in the
 *     heatmap — a useful, honest teaching signal;
 *   - changing the seed reshuffles "meaning" without changing the mechanism,
 *     which reinforces that it's the learned Q/K/V projections — not the raw
 *     embedding — that make trained attention semantically meaningful.
 */

/** Split a sentence into lowercase-preserving word tokens, stripping edge punctuation. */
export function tokenize(sentence: string): string[] {
  return sentence
    .trim()
    .split(/\s+/)
    .map((tok) => tok.replace(/^[^\w']+|[^\w']+$/g, ''))
    .filter((tok) => tok.length > 0);
}

// FNV-1a string hash → 32-bit unsigned int, used to seed a per-token PRNG.
function hashToken(token: string, seed: number): number {
  let h = (0x811c9dc5 ^ seed) >>> 0;
  for (let i = 0; i < token.length; i += 1) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Mulberry32 — small, fast, deterministic PRNG from a 32-bit seed.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One deterministic unit-norm embedding vector for a token, given d_model and a seed. */
export function embedToken(token: string, dModel: number, seed: number): number[] {
  const rng = mulberry32(hashToken(token.toLowerCase(), seed));
  const v: number[] = [];
  for (let i = 0; i < dModel; i += 1) {
    v.push(rng() * 2 - 1);
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

/** Embed a full token sequence into an [n, dModel] matrix. */
export function embedTokens(tokens: string[], dModel: number, seed: number): number[][] {
  return tokens.map((tok) => embedToken(tok, dModel, seed));
}
