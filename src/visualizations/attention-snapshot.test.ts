import { describe, it, expect } from 'vitest';
import { attentionSnapshot, STAGE_LABELS } from './attention-snapshot';
import type { TraceEvent } from '@/types/trace';

const embedEvent: TraceEvent = {
  type: 'attention:embed',
  step: 0,
  tokenEmbeddings: [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [1, 0, 0, 0],
  ],
  positionalEncoding: [
    [0, 1, 0, 1],
    [0.84, 0.54, 0.01, 1],
    [0.91, -0.42, 0.02, 1],
  ],
  positionedEmbeddings: [
    [1, 1, 0, 1],
    [0.84, 1.54, 0.01, 1],
    [1.91, -0.42, 0.02, 1],
  ],
  usePosEnc: true,
  explanation: 'embed explanation',
  math: 'PE',
};

const initEvent: TraceEvent = {
  type: 'attention:init',
  step: 1,
  tokens: ['the', 'cat', 'sat'],
  dModel: 4,
  dK: 2,
  nHeads: 2,
  headsQ: [
    [[1, 0]],
    [[0, 1]],
  ],
  headsK: [
    [[1, 0]],
    [[0, 1]],
  ],
  headsV: [
    [[1, 0]],
    [[0, 1]],
  ],
  explanation: 'init explanation',
  math: 'Q_h = XW_Q^{(h)}',
};

const headAScores = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
const headBScores = [
  [0, 1, 0],
  [1, 0, 0],
  [0, 0, 1],
];

const scoresEvent: TraceEvent = {
  type: 'attention:step',
  step: 1,
  stage: 'scores',
  headMatrices: [headAScores, headBScores],
  explanation: 'scores explanation',
  math: 'scores',
};

const scaledEvent: TraceEvent = {
  type: 'attention:step',
  step: 2,
  stage: 'scaled',
  headMatrices: [
    [
      [0.5, 0, 0],
      [0, 0.5, 0],
      [0, 0, 0.5],
    ],
    [
      [0, 0.5, 0],
      [0.5, 0, 0],
      [0, 0, 0.5],
    ],
  ],
  explanation: 'scaled explanation',
  math: 'scaled',
};

const headASoftmax = [
  [0.6, 0.2, 0.2],
  [0.2, 0.6, 0.2],
  [0.2, 0.2, 0.6],
];
const headBSoftmax = [
  [0.2, 0.6, 0.2],
  [0.6, 0.2, 0.2],
  [0.2, 0.2, 0.6],
];

const softmaxEvent: TraceEvent = {
  type: 'attention:step',
  step: 3,
  stage: 'softmax',
  headMatrices: [headASoftmax, headBSoftmax],
  explanation: 'softmax explanation',
  math: 'softmax',
};

const convergedEvent: TraceEvent = {
  type: 'attention:converged',
  step: 4,
  headWeights: [headASoftmax, headBSoftmax],
  headOutputs: [
    [
      [1, 0],
      [0, 1],
      [0.5, 0.5],
    ],
    [
      [0, 1],
      [1, 0],
      [0.5, 0.5],
    ],
  ],
  concatOutput: [
    [1, 0, 0, 1],
    [0, 1, 1, 0],
    [0.5, 0.5, 0.5, 0.5],
  ],
  output: [
    [0.9, -0.1, 0.2, 0.3],
    [-0.1, 0.9, 0.3, 0.2],
    [0.4, 0.4, 0.4, 0.4],
  ],
  reason: 'done',
  explanation: 'converged explanation',
  math: 'MultiHead',
};

const events: TraceEvent[] = [embedEvent, initEvent, scoresEvent, scaledEvent, softmaxEvent, convergedEvent];

describe('attentionSnapshot', () => {
  it('returns the empty snapshot before any events', () => {
    const snap = attentionSnapshot([], 0);
    expect(snap.tokens).toEqual([]);
    expect(snap.matrix).toBeNull();
    expect(snap.stage).toBe('none');
  });

  it('surfaces the embedding stage from the embed event alone', () => {
    const snap = attentionSnapshot(events, 0);
    expect(snap.stage).toBe('embedding');
    expect(snap.tokenEmbeddings).toEqual(embedEvent.tokenEmbeddings);
    expect(snap.positionalEncoding).toEqual(embedEvent.positionalEncoding);
    expect(snap.positionedEmbeddings).toEqual(embedEvent.positionedEmbeddings);
    expect(snap.usePosEnc).toBe(true);
    expect(snap.explanation).toBe('embed explanation');
  });

  it('picks up tokens/dModel/dK/nHeads from the init event alone', () => {
    const snap = attentionSnapshot(events, 1);
    expect(snap.tokens).toEqual(['the', 'cat', 'sat']);
    expect(snap.dModel).toBe(4);
    expect(snap.dK).toBe(2);
    expect(snap.nHeads).toBe(2);
    expect(snap.matrix).toBeNull();
  });

  it('surfaces head 0 by default at the scores step', () => {
    const snap = attentionSnapshot(events, 2);
    expect(snap.stage).toBe('scores');
    expect(snap.matrix).toEqual(headAScores);
    expect(snap.headMatrices).toEqual([headAScores, headBScores]);
  });

  it('surfaces a different head when selected', () => {
    const snap = attentionSnapshot(events, 2, 1);
    expect(snap.matrix).toEqual(headBScores);
  });

  it('clamps an out-of-range head index to the last head', () => {
    const snap = attentionSnapshot(events, 2, 99);
    expect(snap.matrix).toEqual(headBScores);
  });

  it('averages across heads when "mean" is selected', () => {
    const snap = attentionSnapshot(events, 2, 'mean');
    expect(snap.matrix).toEqual([
      [0.5, 0.5, 0],
      [0.5, 0.5, 0],
      [0, 0, 1],
    ]);
  });

  it('surfaces the scaled matrix after the scaled step', () => {
    const snap = attentionSnapshot(events, 3);
    expect(snap.stage).toBe('scaled');
    expect(snap.matrix).toEqual(scaledEvent.headMatrices[0]);
  });

  it('surfaces softmax weights after the softmax step', () => {
    const snap = attentionSnapshot(events, 4);
    expect(snap.stage).toBe('softmax');
    expect(snap.matrix).toEqual(headASoftmax);
  });

  it('surfaces final weights + block output once converged', () => {
    const snap = attentionSnapshot(events, 5);
    expect(snap.stage).toBe('output');
    expect(snap.matrix).toEqual(headASoftmax);
    expect(snap.headOutput).toEqual(convergedEvent.headOutputs[0]);
    expect(snap.output).toEqual(convergedEvent.output);
    expect(snap.explanation).toBe('converged explanation');
  });

  it('clamps upTo beyond the events length', () => {
    const snap = attentionSnapshot(events, 999);
    expect(snap.stage).toBe('output');
  });

  it('has a label for every stage', () => {
    for (const stage of Object.keys(STAGE_LABELS)) {
      expect(STAGE_LABELS[stage as keyof typeof STAGE_LABELS]).toBeTruthy();
    }
  });
});
