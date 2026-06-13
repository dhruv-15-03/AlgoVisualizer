/**
 * Per-algorithm challenges (P4) — small, optional goals that make a run feel like
 * a puzzle ("reach ≥90% accuracy", "converge in ≤8 iterations").
 *
 * Every evaluator is a PURE function of the emitted trace events, so it is fully
 * unit-testable and decoupled from React/Zustand. The UI just looks up the
 * challenge for the active algorithm, feeds it the current events, and renders
 * the returned outcome.
 *
 * Thresholds are intentionally chosen to be scale-independent (accuracy in 0–1,
 * iteration/step counts, fraction of variance) so they hold across datasets
 * without brittle absolute-loss tuning.
 */
import type { TraceEvent } from '@/types/trace';
import type { AlgorithmId } from '@/types/algorithm';

export type ChallengeStatus = 'met' | 'unmet' | 'pending';

export interface ChallengeOutcome {
  status: ChallengeStatus;
  /** 0–1 fraction toward the goal, for a progress bar. */
  progress: number;
  /** Short human-readable detail, e.g. "accuracy 0.93 ≥ 0.90". */
  detail: string;
  /** The measured metric (undefined while pending). */
  value?: number;
  /** The target the metric is compared against. */
  target: number;
}

export interface Challenge {
  id: string;
  algorithmId: AlgorithmId;
  /** Short imperative goal title. */
  title: string;
  /** One-line description of the goal. */
  description: string;
  evaluate: (events: TraceEvent[]) => ChallengeOutcome;
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

// ─── Metric extractors (pure) ───────────────────────────────────────────────

/** Best (max) accuracy observed across a run, or null if none was emitted. */
export function bestAccuracy(events: TraceEvent[]): number | null {
  let best: number | null = null;
  for (const e of events) {
    const ev = e as unknown as Record<string, unknown>;
    const cand =
      typeof ev.finalAccuracy === 'number'
        ? ev.finalAccuracy
        : typeof ev.ensembleAccuracy === 'number'
          ? ev.ensembleAccuracy
          : typeof ev.accuracy === 'number'
            ? ev.accuracy
            : undefined;
    if (typeof cand === 'number' && Number.isFinite(cand)) {
      best = best === null ? cand : Math.max(best, cand);
    }
  }
  return best;
}

/**
 * Counts steps of `stepType` that occur before the first `convergedType` event,
 * and whether convergence was reached at all.
 */
export function countUntilConverged(
  events: TraceEvent[],
  stepType: TraceEvent['type'],
  convergedType: TraceEvent['type'],
): { steps: number; converged: boolean } {
  let steps = 0;
  for (const e of events) {
    if (e.type === convergedType) return { steps, converged: true };
    if (e.type === stepType) steps++;
  }
  return { steps, converged: false };
}

/** Total leaves from a decision-tree run, or null if it never finished. */
export function decisionTreeLeaves(events: TraceEvent[]): number | null {
  let leaves: number | null = null;
  for (const e of events) {
    if (e.type === 'dtree:done') leaves = e.totalLeaves;
  }
  return leaves;
}

/**
 * Fraction of variance captured by the projection's kept components (PCA emits
 * per-component fractions, so the sum is the total explained variance).
 */
export function explainedVariance(events: TraceEvent[]): number | null {
  let arr: number[] | undefined;
  for (const e of events) {
    if (e.type === 'projection:converged' && Array.isArray(e.varianceExplained)) {
      arr = e.varianceExplained;
    }
  }
  if (!arr) {
    for (const e of events) {
      if (e.type === 'projection:step' && Array.isArray(e.varianceExplained)) {
        arr = e.varianceExplained;
      }
    }
  }
  if (!arr || arr.length === 0) return null;
  return arr.reduce((s, v) => s + v, 0);
}

// ─── Outcome builders ───────────────────────────────────────────────────────

function atLeast(
  value: number | null,
  target: number,
  label: string,
  dp = 2,
): ChallengeOutcome {
  if (value === null) {
    return { status: 'pending', progress: 0, detail: `Run to measure ${label}`, target };
  }
  const met = value >= target;
  return {
    status: met ? 'met' : 'unmet',
    progress: clamp01(value / target),
    detail: `${label} ${round(value, dp)} ${met ? '≥' : '<'} ${round(target, dp)}`,
    value,
    target,
  };
}

function atMostCount(
  value: number | null,
  target: number,
  label: string,
  satisfiedPrecondition = true,
): ChallengeOutcome {
  if (value === null || !satisfiedPrecondition) {
    return { status: 'pending', progress: 0, detail: `Run to measure ${label}`, target };
  }
  const met = value <= target;
  return {
    status: met ? 'met' : 'unmet',
    // Fewer is better: full bar at/under target, shrinking as it overshoots.
    progress: clamp01(value <= target ? 1 : target / value),
    detail: `${label} ${value} ${met ? '≤' : '>'} ${target}`,
    value,
    target,
  };
}

// ─── Challenge definitions ──────────────────────────────────────────────────

const CHALLENGE_LIST: Challenge[] = [
  {
    id: 'logreg-accuracy-90',
    algorithmId: 'logreg',
    title: 'Sharp classifier',
    description: 'Reach training accuracy of at least 90%.',
    evaluate: (events) => atLeast(bestAccuracy(events), 0.9, 'accuracy'),
  },
  {
    id: 'knn-accuracy-92',
    algorithmId: 'knn',
    title: 'Clean neighbourhoods',
    description: 'Reach training accuracy of at least 92%.',
    evaluate: (events) => atLeast(bestAccuracy(events), 0.92, 'accuracy'),
  },
  {
    id: 'kmeans-converge-8',
    algorithmId: 'kmeans',
    title: 'Snap to clusters',
    description: 'Converge in 8 update iterations or fewer.',
    evaluate: (events) => {
      const { steps, converged } = countUntilConverged(
        events,
        'kmeans:update',
        'kmeans:converged',
      );
      return atMostCount(converged ? steps : null, 8, 'iterations', converged);
    },
  },
  {
    id: 'linreg-converge-30',
    algorithmId: 'linreg',
    title: 'Fast descent',
    description: 'Converge in 30 gradient steps or fewer.',
    evaluate: (events) => {
      const { steps, converged } = countUntilConverged(
        events,
        'linreg:step',
        'linreg:converged',
      );
      return atMostCount(converged ? steps : null, 30, 'steps', converged);
    },
  },
  {
    id: 'dtree-compact-12',
    algorithmId: 'dtree',
    title: 'Compact tree',
    description: 'Fit with 12 leaves or fewer to avoid overfitting.',
    evaluate: (events) => atMostCount(decisionTreeLeaves(events), 12, 'leaves'),
  },
  {
    id: 'pca-variance-85',
    algorithmId: 'pca',
    title: 'Faithful projection',
    description: 'Capture at least 85% of variance in the 2D projection.',
    evaluate: (events) => atLeast(explainedVariance(events), 0.85, 'variance'),
  },
];

const BY_ALGORITHM = new Map<AlgorithmId, Challenge[]>();
for (const c of CHALLENGE_LIST) {
  const list = BY_ALGORITHM.get(c.algorithmId) ?? [];
  list.push(c);
  BY_ALGORITHM.set(c.algorithmId, list);
}

/** All defined challenges (stable order). */
export function listChallenges(): Challenge[] {
  return CHALLENGE_LIST;
}

/** The challenge(s) for an algorithm, or an empty array when none exist. */
export function challengesFor(algorithmId: AlgorithmId): Challenge[] {
  return BY_ALGORITHM.get(algorithmId) ?? [];
}
