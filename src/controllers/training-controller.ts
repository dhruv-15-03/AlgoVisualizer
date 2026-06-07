/**
 * TrainingController — the glue between the session store and the Pyodide
 * worker.
 *
 * Responsibilities:
 *   - Boot Pyodide once on first call.
 *   - Subscribe to (code / hyperparams / dataset / algorithm) changes and
 *     trigger debounced re-runs.
 *   - Hand each new run a fresh `runToken` from the store so late-arriving
 *     events from a stale run are dropped.
 *   - Drive a playback ticker that advances `currentStep` while `playing`.
 */

import * as Comlink from 'comlink';
import { ensureWorker } from '@/workers/pyodide.client';
import { useSessionStore } from '@/stores/session-store';
import { getDataset } from '@/datasets/registry';
import type { TraceEvent } from '@/types/trace';
import { debounce } from '@/lib/utils';

let initialized = false;
let initPromise: Promise<void> | null = null;
let unsubscribeStore: (() => void) | null = null;
let tickerId: number | null = null;
let lastTickTimestamp = 0;
let stepAccumulator = 0;

async function ensurePyodide(): Promise<void> {
  if (initialized) return;
  if (initPromise) return initPromise;
  const setStatus = useSessionStore.getState().setPyodideStatus;
  setStatus('loading', 'Starting Pyodide…');

  initPromise = (async () => {
    const worker = ensureWorker();
    await worker.init(
      Comlink.proxy((p) => {
        if (p.stage === 'error') setStatus('error', p.message);
        else if (p.stage === 'ready') setStatus('ready', p.message);
        else setStatus('loading', p.message);
      }),
    );
    initialized = true;
  })();

  return initPromise;
}

async function runOnce(): Promise<void> {
  await ensurePyodide();
  const state = useSessionStore.getState();
  const { algorithmId, datasetId, code, hyperparams } = state;
  if (!algorithmId || !datasetId || !code) return;

  const dataset = getDataset(datasetId);
  if (!dataset) {
    state.beginRun();
    const token = state.runToken + 1;
    state.appendEvent(
      {
        type: 'error',
        step: 0,
        explanation: 'Dataset not found.',
        math: '',
        message: `Unknown dataset id "${datasetId}".`,
      },
      token,
    );
    state.finishRun('error', `Unknown dataset id "${datasetId}".`, token);
    return;
  }

  const token = state.beginRun();
  const worker = ensureWorker();

  const onEvent = Comlink.proxy((rawEvent: Record<string, unknown>) => {
    // Stop accepting events from stale runs.
    if (useSessionStore.getState().runToken !== token) return;
    const event = normalizeEvent(rawEvent, useSessionStore.getState().events.length);
    useSessionStore.getState().appendEvent(event, token);
  });

  try {
    const result = await worker.run(
      code,
      dataset.X,
      dataset.y,
      hyperparams,
      onEvent,
    );
    if (useSessionStore.getState().runToken !== token) return;
    useSessionStore
      .getState()
      .finishRun(result.status, result.status === 'error' ? result.message ?? 'Error' : null, token);
  } catch (err) {
    if (useSessionStore.getState().runToken !== token) return;
    const message = err instanceof Error ? err.message : String(err);
    useSessionStore.getState().appendEvent(
      {
        type: 'error',
        step: 0,
        explanation: 'Worker call failed.',
        math: '',
        message,
      },
      token,
    );
    useSessionStore.getState().finishRun('error', message, token);
  }
}

/**
 * Ensure every trace event has the minimum BaseTraceEvent fields. Python
 * generators may omit `step` or `explanation` for brevity; the UI assumes
 * they're always present.
 */
function normalizeEvent(raw: Record<string, unknown>, fallbackStep: number): TraceEvent {
  const e = { ...raw } as Record<string, unknown>;
  if (typeof e.step !== 'number') e.step = fallbackStep;
  if (typeof e.explanation !== 'string') e.explanation = '';
  if (typeof e.math !== 'string') e.math = '';
  return e as unknown as TraceEvent;
}

const debouncedRun = debounce(() => {
  void runOnce();
}, 350);

function tick(now: number) {
  const { playing, speed, events, currentStep } = useSessionStore.getState();
  if (!playing) {
    stepAccumulator = 0;
    lastTickTimestamp = 0;
    tickerId = requestAnimationFrame(tick);
    return;
  }
  if (events.length === 0) {
    tickerId = requestAnimationFrame(tick);
    return;
  }
  if (lastTickTimestamp === 0) lastTickTimestamp = now;
  const dt = (now - lastTickTimestamp) / 1000;
  lastTickTimestamp = now;
  stepAccumulator += dt * speed;
  if (stepAccumulator >= 1) {
    const advance = Math.floor(stepAccumulator);
    stepAccumulator -= advance;
    const next = currentStep + advance;
    if (next >= events.length - 1) {
      useSessionStore.setState({ currentStep: events.length - 1, playing: false });
      stepAccumulator = 0;
    } else {
      useSessionStore.setState({ currentStep: next });
    }
  }
  tickerId = requestAnimationFrame(tick);
}

/**
 * Attach the controller. Call once during app mount.
 * Returns a cleanup function that detaches subscriptions and stops the ticker.
 */
export function attachController(): () => void {
  if (unsubscribeStore) return () => {};

  unsubscribeStore = useSessionStore.subscribe(
    (s) => ({
      algorithmId: s.algorithmId,
      datasetId: s.datasetId,
      code: s.code,
      hyperparams: s.hyperparams,
    }),
    (curr, prev) => {
      if (!curr.algorithmId || !curr.datasetId || !curr.code) return;
      const changed =
        curr.algorithmId !== prev.algorithmId ||
        curr.datasetId !== prev.datasetId ||
        curr.code !== prev.code ||
        hpChanged(curr.hyperparams, prev.hyperparams);
      if (changed) debouncedRun();
    },
    {
      equalityFn: (a, b) =>
        a.algorithmId === b.algorithmId &&
        a.datasetId === b.datasetId &&
        a.code === b.code &&
        !hpChanged(a.hyperparams, b.hyperparams),
    },
  );

  // If algo+dataset+code are already set by the time we attach (common in
  // StrictMode dev where child effects fire before this parent effect),
  // kick off a run now — the subscriber will miss those initial mutations.
  const s = useSessionStore.getState();
  if (s.algorithmId && s.datasetId && s.code) {
    debouncedRun();
  }

  tickerId = requestAnimationFrame(tick);

  return () => {
    if (unsubscribeStore) unsubscribeStore();
    unsubscribeStore = null;
    if (tickerId !== null) cancelAnimationFrame(tickerId);
    tickerId = null;
  };
}

function hpChanged(
  a: Record<string, number | string | boolean>,
  b: Record<string, number | string | boolean>,
): boolean {
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return true;
  for (const k of ka) {
    if (a[k] !== b[k]) return true;
  }
  return false;
}

/** Force a re-run right now (e.g. "Run" button). Bypasses the debounce. */
export function runNow(): void {
  void runOnce();
}
