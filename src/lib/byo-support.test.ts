import { describe, it, expect } from 'vitest';
import { byoSupport } from '@/lib/byo-support';
import type { AlgorithmMeta } from '@/types/algorithm';

const meta = (compatibleTasks: AlgorithmMeta['compatibleTasks']): AlgorithmMeta =>
  ({ compatibleTasks }) as AlgorithmMeta;

describe('byo-support', () => {
  it('enables CSV + draw for a clustering/classification algorithm', () => {
    const r = byoSupport(meta(['clustering', 'classification']), false);
    expect(r.csv).toBe(true);
    expect(r.draw).toBe(true);
    expect(r.tasks).toEqual(['clustering', 'classification']);
    expect(r.reason).toBe('');
  });

  it('enables CSV but not draw for a regression-only algorithm', () => {
    const r = byoSupport(meta(['regression']), false);
    expect(r.csv).toBe(true);
    expect(r.draw).toBe(false);
    expect(r.tasks).toEqual(['regression']);
  });

  it('disables everything for an image model', () => {
    const r = byoSupport(meta(['classification']), true);
    expect(r.csv).toBe(false);
    expect(r.draw).toBe(false);
    expect(r.reason).toMatch(/image/i);
  });

  it('enables draw for a classification algorithm', () => {
    const r = byoSupport(meta(['classification']), false);
    expect(r.draw).toBe(true);
  });
});
