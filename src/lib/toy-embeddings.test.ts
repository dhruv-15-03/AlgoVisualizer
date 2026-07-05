import { describe, it, expect } from 'vitest';
import { tokenize, embedToken, embedTokens } from './toy-embeddings';

describe('tokenize', () => {
  it('splits on whitespace', () => {
    expect(tokenize('the cat sat')).toEqual(['the', 'cat', 'sat']);
  });

  it('strips edge punctuation but keeps internal apostrophes', () => {
    expect(tokenize("The cat's mat, sat.")).toEqual(['The', "cat's", 'mat', 'sat']);
  });

  it('collapses repeated whitespace and trims', () => {
    expect(tokenize('  the   cat  ')).toEqual(['the', 'cat']);
  });

  it('returns an empty array for blank input', () => {
    expect(tokenize('   ')).toEqual([]);
  });
});

describe('embedToken', () => {
  it('is deterministic for the same token, dModel and seed', () => {
    const a = embedToken('cat', 8, 0);
    const b = embedToken('cat', 8, 0);
    expect(a).toEqual(b);
  });

  it('is case-insensitive', () => {
    expect(embedToken('Cat', 8, 0)).toEqual(embedToken('cat', 8, 0));
  });

  it('produces a unit-norm vector of the requested dimension', () => {
    const v = embedToken('mat', 12, 3);
    expect(v).toHaveLength(12);
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 6);
  });

  it('differs across seeds', () => {
    const a = embedToken('cat', 8, 0);
    const b = embedToken('cat', 8, 1);
    expect(a).not.toEqual(b);
  });

  it('differs across distinct tokens (with overwhelming probability)', () => {
    const a = embedToken('cat', 8, 0);
    const b = embedToken('dog', 8, 0);
    expect(a).not.toEqual(b);
  });
});

describe('embedTokens', () => {
  it('gives repeated words in a sentence identical vectors', () => {
    const tokens = tokenize('the cat sat on the mat');
    const M = embedTokens(tokens, 8, 0);
    // "the" appears at index 0 and 4.
    expect(M[0]).toEqual(M[4]);
  });

  it('returns one row per token, each of length dModel', () => {
    const tokens = ['a', 'b', 'c'];
    const M = embedTokens(tokens, 6, 5);
    expect(M).toHaveLength(3);
    for (const row of M) expect(row).toHaveLength(6);
  });
});
