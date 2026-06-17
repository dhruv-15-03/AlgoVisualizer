/**
 * Race-mode types — head-to-head playback of 2–4 algorithms on the same dataset.
 *
 * Racers are pre-computed: each algorithm trains to completion in the worker
 * (sequentially — there is only one Pyodide instance), then the UI plays back
 * all racers in lockstep using *normalized progress* (0–1 across each racer's
 * own timeline). This is what makes the race meaningful: an algorithm that
 * converges in 5 steps and one that takes 200 are both "halfway done" at 0.5.
 */

import type { TraceEvent } from './trace';
import type { AlgorithmId } from './algorithm';

export type RacerStatus = 'pending' | 'queued' | 'running' | 'done' | 'error';

export interface RacerConfig {
  /** Slot id, stable across the page lifetime (e.g. "A" / "B"). */
  id: string;
  algorithmId: AlgorithmId;
  /** The code that gets executed — seeded from the algorithm's Python source (getAlgorithmSource), mutable later. */
  code: string;
  hyperparams: Record<string, number | string | boolean>;
}

export interface RacerState extends RacerConfig {
  status: RacerStatus;
  events: TraceEvent[];
  errorMessage?: string;
}
