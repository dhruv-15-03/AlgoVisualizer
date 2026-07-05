import { describe, it, expect, beforeEach } from 'vitest';
import { useProgressStore } from '@/stores/progress-store';
import { loadProgress } from '@/lib/progress';

beforeEach(() => {
  localStorage.clear();
  useProgressStore.getState().reset();
});

describe('progress store', () => {
  it('marks a lesson completed and persists it', () => {
    useProgressStore.getState().markCompleted('foundations:linreg');
    expect(useProgressStore.getState().isCompleted('foundations:linreg')).toBe(true);
    expect(loadProgress().completed.has('foundations:linreg')).toBe(true);
  });

  it('is idempotent — re-marking keeps a single entry and a stable reference', () => {
    const { markCompleted } = useProgressStore.getState();
    markCompleted('x');
    const first = useProgressStore.getState().completed;
    markCompleted('x');
    const second = useProgressStore.getState().completed;
    expect(second).toBe(first); // no state churn on a no-op
    expect(second.size).toBe(1);
  });

  it('tracks visited independently of completed', () => {
    const { markVisited } = useProgressStore.getState();
    markVisited('foundations:pca');
    expect(useProgressStore.getState().visited.has('foundations:pca')).toBe(true);
    expect(useProgressStore.getState().isCompleted('foundations:pca')).toBe(false);
  });

  it('reset clears both sets and storage', () => {
    const s = useProgressStore.getState();
    s.markCompleted('a');
    s.markVisited('b');
    s.reset();
    expect(useProgressStore.getState().completed.size).toBe(0);
    expect(useProgressStore.getState().visited.size).toBe(0);
    expect(loadProgress().completed.size).toBe(0);
    expect(loadProgress().visited.size).toBe(0);
  });
});
