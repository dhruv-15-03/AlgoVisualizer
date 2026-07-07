/**
 * Pure snapshot helper for the attention visualizer — reduces the trace
 * event list up to a given step (and a chosen head) into the single
 * matrix/stage the D3 heatmap should render. Kept separate from the React
 * component so the reduction logic is unit-testable without a DOM (mirrors
 * the pattern used by `loss-chart-utils.ts` and the `snapshot()` helper in
 * `MLPViz.tsx`).
 */
import type { TraceEvent } from '@/types/trace';

export type AttentionStage = 'none' | 'scores' | 'scaled' | 'softmax' | 'output';

/** Which head's matrix to surface: a 0-based index, or 'mean' to average across all heads. */
export type HeadSelector = number | 'mean';

export interface AttentionSnapshot {
  tokens: string[];
  dModel: number | null;
  dK: number | null;
  nHeads: number;
  stage: AttentionStage;
  /** The n × n matrix to render for the current stage and selected head. */
  matrix: number[][] | null;
  /** Every head's n × n matrix for the current stage, [nHeads][n][n] — for head-tab previews. */
  headMatrices: number[][][] | null;
  /** Selected head's own n × d_k output (before concat), only once converged. */
  headOutput: number[][] | null;
  /** Final block output n × d_model (post concat + Wo), only once converged. */
  output: number[][] | null;
  explanation: string;
  math: string;
}

const EMPTY: AttentionSnapshot = {
  tokens: [],
  dModel: null,
  dK: null,
  nHeads: 1,
  stage: 'none',
  matrix: null,
  headMatrices: null,
  headOutput: null,
  output: null,
  explanation: '',
  math: '',
};

/** Elementwise mean of a stack of equal-shaped matrices. */
function meanMatrix(mats: number[][][]): number[][] {
  const [first] = mats;
  return first.map((row, i) => row.map((_, j) => mats.reduce((sum, m) => sum + m[i][j], 0) / mats.length));
}

function pickMatrix(mats: number[][][] | null, head: HeadSelector): number[][] | null {
  if (!mats || mats.length === 0) return null;
  if (head === 'mean') return meanMatrix(mats);
  const idx = Math.max(0, Math.min(head, mats.length - 1));
  return mats[idx];
}

export function attentionSnapshot(
  events: TraceEvent[],
  upTo: number,
  head: HeadSelector = 0,
): AttentionSnapshot {
  let tokens: string[] = [];
  let dModel: number | null = null;
  let dK: number | null = null;
  let nHeads = 1;
  let stage: AttentionStage = 'none';
  let headMatrices: number[][][] | null = null;
  let headOutput: number[][] | null = null;
  let output: number[][] | null = null;
  let explanation = '';
  let math = '';

  const last = Math.min(upTo, events.length - 1);
  for (let i = 0; i <= last; i += 1) {
    const e = events[i];
    if (e.type === 'attention:init') {
      tokens = e.tokens;
      dModel = e.dModel;
      dK = e.dK;
      nHeads = e.nHeads;
      explanation = e.explanation;
      math = e.math;
    } else if (e.type === 'attention:step') {
      headMatrices = e.headMatrices;
      stage = e.stage;
      explanation = e.explanation;
      math = e.math;
    } else if (e.type === 'attention:converged') {
      headMatrices = e.headWeights;
      headOutput = pickMatrix(e.headOutputs, head);
      output = e.output;
      stage = 'output';
      explanation = e.explanation;
      math = e.math;
    }
  }

  if (tokens.length === 0 && headMatrices === null) return EMPTY;
  const matrix = pickMatrix(headMatrices, head);
  return { tokens, dModel, dK, nHeads, stage, matrix, headMatrices, headOutput, output, explanation, math };
}

/** Human-friendly label for a stage, used in the step scrubber and panel titles. */
export const STAGE_LABELS: Record<AttentionStage, string> = {
  none: 'Not run yet',
  scores: 'Raw scores  QKᵀ',
  scaled: 'Scaled  QKᵀ/√d_k',
  softmax: 'Softmax weights',
  output: 'Weighted output  AV',
};
