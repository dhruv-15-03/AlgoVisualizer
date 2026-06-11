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

/** Start the RAF playback loop if it isn't already running. Idempotent. */
function startTicker() {
  if (tickerId === null) {
    tickerId = requestAnimationFrame(tick);
  }
}

/** Stop the RAF playback loop and reset the frame-timing accumulators. */
function stopTicker() {
  if (tickerId !== null) {
    cancelAnimationFrame(tickerId);
    tickerId = null;
  }
  lastTickTimestamp = 0;
  stepAccumulator = 0;
}

function tick(now: number) {
  const { playing, speed, events, currentStep } = useSessionStore.getState();
  // Nothing to animate — stop the loop entirely instead of idling at ~60fps.
  // The `playing` subscription in attachController restarts it on the next play.
  if (!playing || events.length === 0) {
    stopTicker();
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
      stopTicker();
      return;
    }
    useSessionStore.setState({ currentStep: next });
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

  // Drive the playback ticker only while `playing` is true. Starting/stopping
  // on the `playing` transition avoids an idle RAF loop burning a frame ~60x/s
  // on an otherwise static workspace.
  const unsubscribePlaying = useSessionStore.subscribe(
    (s) => s.playing,
    (playing) => {
      if (playing) startTicker();
      else stopTicker();
    },
  );

  // If algo+dataset+code are already set by the time we attach (common in
  // StrictMode dev where child effects fire before this parent effect),
  // kick off a run now — the subscriber will miss those initial mutations.
  const s = useSessionStore.getState();
  if (s.algorithmId && s.datasetId && s.code) {
    debouncedRun();
  }
  // Cover the edge case where playback is somehow already active at attach.
  if (s.playing) startTicker();

  return () => {
    if (unsubscribeStore) unsubscribeStore();
    unsubscribeStore = null;
    unsubscribePlaying();
    stopTicker();
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

/**
 * Start downloading the Pyodide runtime in the background without running
 * anything yet. Safe to call multiple times. Used by the Home page so that
 * by the time the user navigates into a workspace, Python is already loading
 * (or fully loaded) instead of cold-starting after the route transition.
 */
export function prewarmPyodide(): void {
  if (initialized || initPromise) return;
  void ensurePyodide().catch(() => {
    // Swallow — the user hasn't asked to run anything yet, so a prewarm
    // failure shouldn't surface an error toast. The next real run will
    // re-attempt and report normally.
  });
}
