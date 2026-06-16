import { describe, it, expect } from 'vitest';
import { listAlgorithms } from './registry';
import { SKLEARN_SNIPPETS, getSklearnSnippet } from './sklearn-snippets';

// The Record<AlgorithmId, string> type already makes a missing snippet a compile
// error; this guards the runtime contract: every registered algorithm resolves
// to a non-empty, sklearn-flavoured snippet, and there are no stale extras.
describe('sklearn snippets', () => {
  const ids = listAlgorithms().map((a) => a.id);

  it('has exactly one snippet per registered algorithm', () => {
    expect(Object.keys(SKLEARN_SNIPPETS).sort()).toEqual([...ids].sort());
  });

  it('every snippet is a non-empty Python import example', () => {
    for (const id of ids) {
      const snippet = getSklearnSnippet(id);
      expect(snippet.length, `"${id}" should have a snippet`).toBeGreaterThan(0);
      // Most are sklearn; RL/deep models intentionally show the real-world stack
      // (Gymnasium, Stable-Baselines3, PyTorch). All are runnable import examples.
      expect(snippet, `"${id}" snippet should be Python code`).toContain('import');
    }
  });
});
