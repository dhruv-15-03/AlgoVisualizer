/**
 * Thin wrapper for accessing the Pyodide worker from React land.
 *
 * Idempotent: calls to ensureWorker() return the same Comlink proxy.
 */

import * as Comlink from 'comlink';
import type { PyodideWorkerApi, InitProgress, RunResult } from '@/workers/pyodide.worker';

type Wrapped = Comlink.Remote<PyodideWorkerApi>;

let wrapped: Wrapped | null = null;
let worker: Worker | null = null;

export function ensureWorker(): Wrapped {
  if (wrapped) return wrapped;
  worker = new Worker(new URL('@/workers/pyodide.worker.ts', import.meta.url), {
    type: 'module',
    name: 'pyodide-worker',
  });
  wrapped = Comlink.wrap<PyodideWorkerApi>(worker);
  return wrapped;
}

export function terminateWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
    wrapped = null;
  }
}

export type { InitProgress, RunResult };
