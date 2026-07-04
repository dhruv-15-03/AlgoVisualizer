import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the worker client so no real Worker / Pyodide runtime is spun up in
// jsdom. `initImpl` is swapped per-phase to simulate a failing then recovering
// CDN. Spies are created via vi.hoisted so the (hoisted) vi.mock factory can
// reference them safely.
const { initSpy, terminateSpy, ctl } = vi.hoisted(() => ({
  initSpy: vi.fn(),
  terminateSpy: vi.fn(),
  ctl: {
    initImpl: (_cb: (p: { stage: string; message: string }) => void): Promise<void> =>
      Promise.resolve(),
  },
}));

vi.mock('@/workers/pyodide.client', () => ({
  ensureWorker: () => ({
    init: (cb: (p: { stage: string; message: string }) => void) => {
      initSpy(cb);
      return ctl.initImpl(cb);
    },
    run: vi.fn(),
  }),
  terminateWorker: () => terminateSpy(),
}));

import { runNow, retryPyodide } from '@/controllers/training-controller';
import { useSessionStore } from '@/stores/session-store';

beforeEach(() => {
  initSpy.mockClear();
  terminateSpy.mockClear();
  // No algorithm set → runOnce() short-circuits right after ensurePyodide(),
  // so these tests exercise only the load path (no dataset import / worker.run).
  useSessionStore.setState({
    algorithmId: null,
    datasetId: null,
    code: '',
    pyodideStatus: 'idle',
  });
});

describe('training-controller · Pyodide load failure', () => {
  it('flips pyodideStatus to error instead of hanging on the loading spinner', async () => {
    ctl.initImpl = () => Promise.reject(new Error('worker boom'));
    runNow();
    await vi.waitFor(() => {
      expect(useSessionStore.getState().pyodideStatus).toBe('error');
    });
    expect(useSessionStore.getState().pyodideProgress).toContain('worker boom');
  });

  it('retryPyodide tears down the worker and re-attempts, reaching ready', async () => {
    ctl.initImpl = () => Promise.reject(new Error('transient'));
    runNow();
    await vi.waitFor(() => expect(useSessionStore.getState().pyodideStatus).toBe('error'));

    // CDN recovers: the next init resolves and reports ready via its callback.
    ctl.initImpl = (cb) => {
      cb({ stage: 'ready', message: 'Ready' });
      return Promise.resolve();
    };
    retryPyodide();
    await vi.waitFor(() => expect(useSessionStore.getState().pyodideStatus).toBe('ready'));
    expect(terminateSpy).toHaveBeenCalledTimes(1);
  });
});
