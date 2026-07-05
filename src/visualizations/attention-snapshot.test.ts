import { describe, it, expect } from 'vitest';
import { attentionSnapshot, STAGE_LABELS } from './attention-snapshot';
import type { TraceEvent } from '@/types/trace';

const initEvent: TraceEvent = {
  type: 'attention:init',
  step: 0,
  tokens: ['the', 'cat', 'sat'],
  dModel: 4,
  dK: 2,
  Q: [[1, 0]],
  K: [[1, 0]],
  V: [[1, 0]],
  explanation: 'init explanation',
  math: 'Q = XW_Q',
};

const scoresEvent: TraceEvent = {
  type: 'attention:step',
  step: 1,
  stage: 'scores',
  scores: [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
  explanation: 'scores explanation',
  math: 'scores',
};

const scaledEvent: TraceEvent = {
  type: 'attention:step',
  step: 2,
  stage: 'scaled',
  scores: [
    [0.5, 0, 0],
    [0, 0.5, 0],
    [0, 0, 0.5],
  ],
  explanation: 'scaled explanation',
  math: 'scaled',
};

const softmaxEvent: TraceEvent = {
  type: 'attention:step',
  step: 3,
  stage: 'softmax',
  scores: [
    [0.6, 0.2, 0.2],
    [0.2, 0.6, 0.2],
    [0.2, 0.2, 0.6],
  ],
  explanation: 'softmax explanation',
  math: 'softmax',
};

const convergedEvent: TraceEvent = {
  type: 'attention:converged',
  step: 4,
  weights: [
    [0.6, 0.2, 0.2],
    [0.2, 0.6, 0.2],
    [0.2, 0.2, 0.6],
  ],
  output: [
    [1, 0],
    [0, 1],
    [0.5, 0.5],
  ],
  reason: 'done',
  explanation: 'converged explanation',
  math: 'AV',
};

const events: TraceEvent[] = [initEvent, scoresEvent, scaledEvent, softmaxEvent, convergedEvent];

describe('attentionSnapshot', () => {
  it('returns the empty snapshot before any events', () => {
    const snap = attentionSnapshot([], 0);
    expect(snap.tokens).toEqual([]);
    expect(snap.matrix).toBeNull();
    expect(snap.stage).toBe('none');
  });

  it('picks up tokens/dModel/dK from the init event alone', () => {
    const snap = attentionSnapshot(events, 0);
    expect(snap.tokens).toEqual(['the', 'cat', 'sat']);
    expect(snap.dModel).toBe(4);
    expect(snap.dK).toBe(2);
    expect(snap.matrix).toBeNull();
  });

  it('surfaces the raw scores matrix and stage after the scores step', () => {
    const snap = attentionSnapshot(events, 1);
    expect(snap.stage).toBe('scores');
    expect(snap.matrix).toEqual(scoresEvent.scores);
  });

  it('surfaces the scaled matrix after the scaled step', () => {
    const snap = attentionSnapshot(events, 2);
    expect(snap.stage).toBe('scaled');
    expect(snap.matrix).toEqual(scaledEvent.scores);
  });

  it('surfaces softmax weights after the softmax step', () => {
    const snap = attentionSnapshot(events, 3);
    expect(snap.stage).toBe('softmax');
    expect(snap.matrix).toEqual(softmaxEvent.scores);
  });

  it('surfaces final weights + output once converged', () => {
    const snap = attentionSnapshot(events, 4);
    expect(snap.stage).toBe('output');
    expect(snap.matrix).toEqual(convergedEvent.weights);
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
