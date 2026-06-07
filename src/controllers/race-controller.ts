/**
 * Race controller — pre-computes the trace for each racer, then drives the
 * shared playback ticker.
 *
 * Runs sequentially because the Pyodide worker is single-threaded. This
 * matches what we'd do for a CLI benchmark anyway.
 */

import * as Comlink from 'comlink';
import { ensureWorker } from '@/workers/pyodide.client';
import { getDataset } from '@/datasets/registry';
import { useRaceStore } from '@/stores/race-store';
import type { TraceEvent } from '@/types/trace';

export async function ensurePyodideForRace(
  onStatus?: (msg: string) => void,
): Promise<void> {
  const worker = ensureWorker();
  await worker.init(
    Comlink.proxy((p) => {
      if (onStatus) onStatus(p.message);
    }),
  );
}

/**
 * Run every racer that's `pending`. Existing `done` racers are not re-run
 * unless their config changed (which resets them to `pending` via updateRacer).
 */
export async function runAllRacers(): Promise<void> {
  const state = useRaceStore.getState();
  const { datasetId, racers } = state;
  if (!datasetId) throw new Error('Pick a dataset first.');
  const ds = getDataset(datasetId);
  if (!ds) throw new Error(`Unknown dataset: ${datasetId}`);

  const worker = ensureWorker();

  // Mark all pending racers as queued so the UI can show a clear "waiting" badge.
  for (const r of racers) {
    if (r.status === 'pending') useRaceStore.getState().setRacerStatus(r.id, 'queued');
  }

  for (const r of useRaceStore.getState().racers) {
    if (r.status !== 'queued') continue;
    useRaceStore.getState().setRacerStatus(r.id, 'running');
    useRaceStore.getState().resetRacerEvents(r.id);
    useRaceStore.getState().setRacerStatus(r.id, 'running');

    let count = 0;
    const onEvent = Comlink.proxy((rawEvent: Record<string, unknown>) => {
      if (rawEvent.type === 'finished') return;
      const normalized: TraceEvent = {
        ...(rawEvent as Record<string, unknown>),
        step: typeof rawEvent.step === 'number' ? rawEvent.step : count,
        explanation: typeof rawEvent.explanation === 'string' ? rawEvent.explanation : '',
        math: typeof rawEvent.math === 'string' ? rawEvent.math : '',
      } as unknown as TraceEvent;
      count += 1;
      useRaceStore.getState().appendRacerEvent(r.id, normalized);
    });

    try {
      const result = await worker.run(r.code, ds.X, ds.y, r.hyperparams, onEvent);
      if (result.status === 'error') {
        useRaceStore.getState().setRacerStatus(r.id, 'error', result.message ?? 'Run failed');
      } else if (result.status === 'cancelled') {
        useRaceStore.getState().setRacerStatus(r.id, 'error', 'Cancelled (another run preempted this one).');
      } else {
        useRaceStore.getState().setRacerStatus(r.id, 'done');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      useRaceStore.getState().setRacerStatus(r.id, 'error', msg);
    }
  }

  // Reset progress so playback starts fresh.
  useRaceStore.getState().reset();
}

let tickerId: number | null = null;
let lastTickTimestamp = 0;

/** Drive the shared playback ticker. Returns a cleanup function. */
export function attachRaceTicker(): () => void {
  const tick = (now: number) => {
    const { playing, speed, progress, racers } = useRaceStore.getState();
    if (!playing || racers.length === 0) {
      lastTickTimestamp = 0;
      tickerId = requestAnimationFrame(tick);
      return;
    }
    if (lastTickTimestamp === 0) lastTickTimestamp = now;
    const dt = (now - lastTickTimestamp) / 1000;
    lastTickTimestamp = now;
    // Step duration: aim for ~`speed` "races per second" — at speed=1 a full race takes 1s,
    // at speed=0.5 it takes 2s. We slow that down a lot in practice so animations are visible.
    const racesPerSecond = speed * 0.1; // i.e. speed=1 → full race in 10s
    const next = progress + dt * racesPerSecond;
    if (next >= 1) {
      useRaceStore.setState({ progress: 1, playing: false });
    } else {
      useRaceStore.setState({ progress: next });
    }
    tickerId = requestAnimationFrame(tick);
  };
  tickerId = requestAnimationFrame(tick);
  return () => {
    if (tickerId !== null) cancelAnimationFrame(tickerId);
    tickerId = null;
    lastTickTimestamp = 0;
  };
}
