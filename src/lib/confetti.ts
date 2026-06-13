/**
 * Pure confetti-particle generator for the convergence celebration.
 *
 * Kept free of React/DOM so it can be unit-tested and so the visual component
 * stays a thin, declarative mapping. Output is deterministic for a given
 * `seed`, which makes the behaviour testable and lets the UI re-trigger a fresh
 * burst by bumping the seed. Each piece carries everything the CSS
 * `confetti-fall` keyframe needs (start position, drift, fall, rotation, size,
 * timing) so animation is GPU-friendly (transform/opacity only).
 */
export interface ConfettiPiece {
  id: number;
  /** Horizontal start position as a percentage of the container width (0–100). */
  left: number;
  /** Fill colour (hex). */
  color: string;
  /** Horizontal drift target in px (CSS var --cx). */
  dx: number;
  /** Vertical fall target in px (CSS var --cy). */
  dy: number;
  /** Final rotation in degrees (CSS var --cr). */
  rotate: number;
  /** Edge length in px. */
  size: number;
  /** Animation delay in ms. */
  delay: number;
  /** Animation duration in ms. */
  duration: number;
}

export interface ConfettiOptions {
  /** Number of pieces. Default 28. */
  count?: number;
  /** Palette to sample from. Falls back to a tasteful default set. */
  colors?: string[];
  /** Deterministic seed (same seed → same output). Default 1. */
  seed?: number;
  /** Horizontal spread magnitude in px. Default 140. */
  spread?: number;
  /** Vertical fall magnitude in px. Default 220. */
  fall?: number;
}

const DEFAULT_COLORS = ['#5b75ff', '#4ade80', '#fcd34d', '#7cc4ff', '#c4b5fd'];

/** Small, fast, deterministic PRNG (mulberry32). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates a deterministic set of confetti pieces. Pure: no Math.random, no
 * Date, no DOM — identical input yields identical output.
 */
export function generateConfetti(opts: ConfettiOptions = {}): ConfettiPiece[] {
  const {
    count = 28,
    colors = DEFAULT_COLORS,
    seed = 1,
    spread = 140,
    fall = 220,
  } = opts;

  const safeColors = colors.length > 0 ? colors : DEFAULT_COLORS;
  const n = Math.max(0, Math.floor(count));
  const rand = mulberry32(seed);
  const pieces: ConfettiPiece[] = [];

  for (let i = 0; i < n; i++) {
    const r1 = rand();
    const r2 = rand();
    const r3 = rand();
    const r4 = rand();
    const r5 = rand();
    pieces.push({
      id: i,
      left: Math.round(r1 * 100),
      color: safeColors[i % safeColors.length],
      // Centre-biased horizontal drift (can go left or right).
      dx: Math.round((r2 - 0.5) * 2 * spread),
      dy: Math.round(fall * (0.6 + r3 * 0.6)),
      rotate: Math.round((r4 - 0.5) * 2 * 540),
      size: Math.round(5 + r5 * 6),
      delay: Math.round(r2 * 120),
      duration: Math.round(1200 + r3 * 700),
    });
  }

  return pieces;
}
