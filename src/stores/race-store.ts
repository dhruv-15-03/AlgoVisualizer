/**
 * Race-mode store.
 *
 * A *racer* is one (algorithm, code, hyperparams) bundle. The page holds 2–4
 * racers all training on the same dataset. Pre-computed events live here; the
 * page picks the right event per racer based on `progress` (0..1 of that
 * racer's own timeline).
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { RacerState, RacerStatus } from '@/types/race';
import type { TraceEvent } from '@/types/trace';
import type { AlgorithmId } from '@/types/algorithm';

interface RaceStore {
  datasetId: string | null;
  racers: RacerState[];

  /** Normalized 0..1 race position. Each racer maps it onto its own timeline. */
  progress: number;
  playing: boolean;
  /** Plays back at this fraction of each racer's timeline per second. */
  speed: number;

  /** Setters & lifecycle */
  setDataset: (id: string) => void;

  addRacer: (id: string, algorithmId: AlgorithmId, code: string, hp: Record<string, number | string | boolean>) => void;
  removeRacer: (id: string) => void;
  updateRacer: (id: string, patch: Partial<Pick<RacerState, 'algorithmId' | 'code' | 'hyperparams'>>) => void;
  resetRacerEvents: (id: string) => void;
  setRacerStatus: (id: string, status: RacerStatus, msg?: string) => void;
  appendRacerEvent: (id: string, e: TraceEvent) => void;

  setProgress: (p: number) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  reset: () => void;
  setSpeed: (s: number) => void;
}

export const useRaceStore = create<RaceStore>()(
  subscribeWithSelector((set, get) => ({
    datasetId: null,
    racers: [],
    progress: 0,
    playing: false,
    speed: 1.0,

    setDataset: (id) => set({ datasetId: id }),

    addRacer: (id, algorithmId, code, hp) =>
      set((s) => ({
        racers: [
          ...s.racers,
          {
            id,
            algorithmId,
            code,
            hyperparams: hp,
            status: 'pending',
            events: [],
          },
        ],
      })),

    removeRacer: (id) => set((s) => ({ racers: s.racers.filter((r) => r.id !== id) })),

    updateRacer: (id, patch) =>
      set((s) => ({
        racers: s.racers.map((r) => (r.id === id ? { ...r, ...patch, status: 'pending', events: [] } : r)),
        progress: 0,
        playing: false,
      })),

    resetRacerEvents: (id) =>
      set((s) => ({
        racers: s.racers.map((r) => (r.id === id ? { ...r, events: [], status: 'pending', errorMessage: undefined } : r)),
      })),

    setRacerStatus: (id, status, msg) =>
      set((s) => ({
        racers: s.racers.map((r) =>
          r.id === id ? { ...r, status, errorMessage: status === 'error' ? msg : undefined } : r,
        ),
      })),

    appendRacerEvent: (id, e) =>
      set((s) => ({
        racers: s.racers.map((r) => (r.id === id ? { ...r, events: [...r.events, e] } : r)),
      })),

    setProgress: (p) => {
      const clamped = Math.max(0, Math.min(1, p));
      set({ progress: clamped });
    },
    play: () => {
      const { progress } = get();
      // restart from 0 if we're at the end
      set({ playing: true, progress: progress >= 0.999 ? 0 : progress });
    },
    pause: () => set({ playing: false }),
    togglePlay: () => (get().playing ? get().pause() : get().play()),
    reset: () => set({ progress: 0, playing: false }),
    setSpeed: (s) => set({ speed: Math.max(0.1, Math.min(4, s)) }),
  })),
);

/** Number of events in the racer with the longest timeline. Useful for stepping by 1 event. */
export function maxRacerLength(racers: RacerState[]): number {
  let m = 0;
  for (const r of racers) {
    if (r.events.length > m) m = r.events.length;
  }
  return m;
}

/** Compute the per-racer step index for a given race progress (0..1). */
export function progressToStep(progress: number, eventsLength: number): number {
  if (eventsLength <= 0) return 0;
  return Math.max(0, Math.min(eventsLength - 1, Math.round(progress * (eventsLength - 1))));
}
