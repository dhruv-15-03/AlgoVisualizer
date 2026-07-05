/**
 * Pure snapshot helper for the attention visualizer — reduces the trace
 * event list up to a given step into the single matrix/stage the D3 heatmap
 * should render. Kept separate from the React component so the reduction
 * logic is unit-testable without a DOM (mirrors the pattern used by
 * `loss-chart-utils.ts` and the `snapshot()` helper in `MLPViz.tsx`).
 */
import type { TraceEvent } from '@/types/trace';

export type AttentionStage = 'none' | 'scores' | 'scaled' | 'softmax' | 'output';

export interface AttentionSnapshot {
  tokens: string[];
  dModel: number | null;
  dK: number | null;
  stage: AttentionStage;
  /** The n × n matrix to render for the current stage (scores, scaled, softmax weights, or final weights). */
  matrix: number[][] | null;
  /** Final contextualized output vectors (n × d_k), only present once converged. */
  output: number[][] | null;
  explanation: string;
  math: string;
}

const EMPTY: AttentionSnapshot = {
  tokens: [],
  dModel: null,
  dK: null,
  stage: 'none',
  matrix: null,
  output: null,
  explanation: '',
  math: '',
};

export function attentionSnapshot(events: TraceEvent[], upTo: number): AttentionSnapshot {
  let tokens: string[] = [];
  let dModel: number | null = null;
  let dK: number | null = null;
  let stage: AttentionStage = 'none';
  let matrix: number[][] | null = null;
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
      explanation = e.explanation;
      math = e.math;
    } else if (e.type === 'attention:step') {
      matrix = e.scores;
      stage = e.stage;
      explanation = e.explanation;
      math = e.math;
    } else if (e.type === 'attention:converged') {
      matrix = e.weights;
      output = e.output;
      stage = 'output';
      explanation = e.explanation;
      math = e.math;
    }
  }

  if (tokens.length === 0 && matrix === null) return EMPTY;
  return { tokens, dModel, dK, stage, matrix, output, explanation, math };
}

/** Human-friendly label for a stage, used in the step scrubber and panel titles. */
export const STAGE_LABELS: Record<AttentionStage, string> = {
  none: 'Not run yet',
  scores: 'Raw scores  QKᵀ',
  scaled: 'Scaled  QKᵀ/√d_k',
  softmax: 'Softmax weights',
  output: 'Weighted output  AV',
};
