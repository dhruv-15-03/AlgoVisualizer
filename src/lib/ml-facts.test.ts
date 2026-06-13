import { describe, it, expect } from 'vitest';
import { ML_FACTS, factAt, factCount } from './ml-facts';

describe('ml-facts', () => {
  it('exposes a non-empty list of non-empty facts', () => {
    expect(ML_FACTS.length).toBeGreaterThan(0);
    expect(factCount()).toBe(ML_FACTS.length);
    for (const fact of ML_FACTS) {
      expect(fact.trim().length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate facts', () => {
    expect(new Set(ML_FACTS).size).toBe(ML_FACTS.length);
  });

  it('returns the matching fact for in-range indices', () => {
    expect(factAt(0)).toBe(ML_FACTS[0]);
    expect(factAt(ML_FACTS.length - 1)).toBe(ML_FACTS[ML_FACTS.length - 1]);
  });

  it('cycles for indices beyond the list length', () => {
    expect(factAt(ML_FACTS.length)).toBe(ML_FACTS[0]);
    expect(factAt(ML_FACTS.length + 2)).toBe(ML_FACTS[2]);
  });

  it('wraps negative indices', () => {
    expect(factAt(-1)).toBe(ML_FACTS[ML_FACTS.length - 1]);
    expect(factAt(-ML_FACTS.length)).toBe(ML_FACTS[0]);
  });

  it('floors fractional indices', () => {
    expect(factAt(1.9)).toBe(ML_FACTS[1]);
  });
});
