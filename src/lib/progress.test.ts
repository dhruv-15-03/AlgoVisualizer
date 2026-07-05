import { describe, it, expect, beforeEach } from 'vitest';
import { loadProgress, saveCompleted, saveVisited, PROGRESS_KEYS } from '@/lib/progress';

beforeEach(() => localStorage.clear());

describe('progress persistence', () => {
  it('returns empty sets when nothing is stored', () => {
    const p = loadProgress();
    expect(p.completed.size).toBe(0);
    expect(p.visited.size).toBe(0);
  });

  it('round-trips completed + visited independently', () => {
    saveCompleted(new Set(['a', 'b']));
    saveVisited(new Set(['b', 'c']));
    const p = loadProgress();
    expect([...p.completed].sort()).toEqual(['a', 'b']);
    expect([...p.visited].sort()).toEqual(['b', 'c']);
  });

  it('persists under the documented keys as JSON arrays', () => {
    saveCompleted(new Set(['x']));
    expect(JSON.parse(localStorage.getItem(PROGRESS_KEYS.completed) as string)).toEqual(['x']);
  });

  it('ignores malformed JSON', () => {
    localStorage.setItem(PROGRESS_KEYS.completed, '{not json');
    expect(loadProgress().completed.size).toBe(0);
  });

  it('ignores a non-array payload', () => {
    localStorage.setItem(PROGRESS_KEYS.visited, JSON.stringify({ a: 1 }));
    expect(loadProgress().visited.size).toBe(0);
  });

  it('filters out non-string members', () => {
    localStorage.setItem(PROGRESS_KEYS.completed, JSON.stringify(['ok', 3, null, 'yes']));
    expect([...loadProgress().completed].sort()).toEqual(['ok', 'yes']);
  });
});
