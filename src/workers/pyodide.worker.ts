/**
 * Pyodide Web Worker.
 *
 * Loads CPython (via Pyodide WASM) and exposes two operations to the main
 * thread via Comlink:
 *
 *   init(onProgress)            — load runtime + numpy (call once, cached)
 *   run(code, X, y, hp, onEvent) — exec user code, stream trace events
 *
 * The user's code must define a top-level `run(X, y=None, **kwargs)`
 * generator that yields plain dicts shaped as TraceEvents.
 */

import * as Comlink from 'comlink';
import { loadPyodide, type PyodideInterface } from 'pyodide';

// Pyodide is heavy; keep one instance for the worker's lifetime.
let pyodide: PyodideInterface | null = null;
let loadPromise: Promise<void> | null = null;

// Cancellation handle for the in-flight run; tested between yields.
let currentRun: { cancelled: boolean } | null = null;

const RUNNER_PY = `
import numpy as np

def _make_generator(user_code, X_list, y_list, hp_dict):
    X = np.array(X_list, dtype=float)
    y = np.array(y_list) if y_list is not None else None
    ns = {'np': np, 'X': X, 'y': y, '__builtins__': __builtins__}
    exec(user_code, ns)
    if 'run' not in ns or not callable(ns['run']):
        raise ValueError("Your code must define a generator function 'run(X, y=None, **kwargs)'.")
    fn = ns['run']
    if y is not None:
        return iter(fn(X, y, **hp_dict))
    return iter(fn(X, **hp_dict))
`;

export interface InitProgress {
  stage: 'loading-runtime' | 'loading-numpy' | 'ready' | 'error';
  message: string;
}

export interface RunResult {
  status: 'success' | 'cancelled' | 'error';
  message?: string;
  totalEvents: number;
}

async function init(onProgress: (p: InitProgress) => void): Promise<void> {
  if (pyodide) {
    onProgress({ stage: 'ready', message: 'Python ready' });
    return;
  }
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      onProgress({ stage: 'loading-runtime', message: 'Loading Python runtime…' });
      pyodide = await loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/',
        stdout: (msg) => console.log('[py]', msg),
        stderr: (msg) => console.warn('[py-err]', msg),
      });
      onProgress({ stage: 'loading-numpy', message: 'Loading numpy…' });
      await pyodide.loadPackage(['numpy']);
      pyodide.runPython(RUNNER_PY);
      onProgress({ stage: 'ready', message: 'Ready' });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      onProgress({ stage: 'error', message });
      throw err;
    }
  })();

  return loadPromise;
}

async function run(
  code: string,
  X: number[][],
  y: number[] | null,
  hyperparams: Record<string, number | string | boolean>,
  onEvent: (e: Record<string, unknown>) => void | Promise<void>,
): Promise<RunResult> {
  if (!pyodide) {
    throw new Error('Pyodide not initialized; call init() first.');
  }

  // Cancel any prior run.
  if (currentRun) currentRun.cancelled = true;
  const handle = { cancelled: false };
  currentRun = handle;

  let generator: unknown = null;
  let totalEvents = 0;

  try {
    // Hand inputs to Python.
    pyodide.globals.set('user_code', code);
    pyodide.globals.set('X_list', pyodide.toPy(X));
    pyodide.globals.set('y_list', y === null ? null : pyodide.toPy(y));
    pyodide.globals.set('hp_dict', pyodide.toPy(hyperparams));

    generator = pyodide.runPython(
      '_make_generator(user_code, X_list, y_list, hp_dict)',
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await onEvent({
      type: 'error',
      step: 0,
      explanation: 'Python error before execution started.',
      math: '',
      message,
      pythonTraceback: message,
    });
    currentRun = null;
    return { status: 'error', message, totalEvents: 0 };
  }

  // Iterate the generator. Each next() runs Python until the next yield;
  // between yields we await onEvent (a Comlink proxy call) which lets the
  // event loop check `handle.cancelled` in the loop condition.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gen = generator as any;

  try {
    while (!handle.cancelled) {
      let next;
      try {
        next = gen.next();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await onEvent({
          type: 'error',
          step: totalEvents,
          explanation: 'Python raised an exception during execution.',
          math: '',
          message,
          pythonTraceback: message,
        });
        return { status: 'error', message, totalEvents };
      }

      if (next.done) {
        next.value?.destroy?.();
        await onEvent({
          type: 'finished',
          step: totalEvents,
          explanation: 'Algorithm finished.',
          math: '',
          totalSteps: totalEvents,
        });
        return { status: 'success', totalEvents };
      }

      const pyEvent = next.value;
      const event = pyEvent.toJs({ dict_converter: Object.fromEntries }) as Record<
        string,
        unknown
      >;
      pyEvent.destroy?.();
      totalEvents += 1;
      await onEvent(event);
    }
    return { status: 'cancelled', totalEvents };
  } finally {
    try {
      gen.destroy?.();
    } catch {
      /* ignore */
    }
    if (currentRun === handle) currentRun = null;
  }
}

function cancel(): void {
  if (currentRun) currentRun.cancelled = true;
}

const api = { init, run, cancel };
export type PyodideWorkerApi = typeof api;
Comlink.expose(api);
