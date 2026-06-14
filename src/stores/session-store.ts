/**
 * Session store — central state for one workspace session.
 *
 * Holds the chosen algorithm + dataset, the user's editable code, hyperparams,
 * the trace event buffer, and playback state. The TrainingController writes
 * trace events here; visualizations read them.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { AlgorithmId, AlgorithmHyperparam } from '@/types/algorithm';
import type { TraceEvent } from '@/types/trace';
import type { Dataset } from '@/types/dataset';
import type { PyodideStage } from '@/lib/pyodide-progress';
import type { WorkspaceShareState } from '@/lib/share-link';

export type PyodideStatus = 'idle' | 'loading' | 'ready' | 'error';
export type RunStatus = 'idle' | 'running' | 'success' | 'cancelled' | 'error';

export interface HyperparamValue {
  value: number | string | boolean;
}

interface SessionState {
  pyodideStatus: PyodideStatus;
  pyodideProgress: string;
  pyodideStage: PyodideStage;

  algorithmId: AlgorithmId | null;
  datasetId: string | null;
  /** User-supplied datasets (CSV upload / drawn points). Resolved by the dataset registry. */
  customDatasets: Dataset[];

  code: string;
  hyperparams: Record<string, number | string | boolean>;

  events: TraceEvent[];
  runStatus: RunStatus;
  runError: string | null;
  runToken: number;

  currentStep: number;
  playing: boolean;
  speed: number;
  /** When true, the "what's happening" panel is blurred until the user reveals it per step. */
  quizMode: boolean;

  setPyodideStatus: (s: PyodideStatus, msg?: string, stage?: PyodideStage) => void;

  setAlgorithm: (id: AlgorithmId, defaults: { code: string; hyperparams: AlgorithmHyperparam[] }) => void;
  setDataset: (id: string) => void;
  /** Register (or replace by id) a user-supplied dataset. */
  addCustomDataset: (ds: Dataset) => void;
  /** Atomically restore a workspace from a decoded share link. */
  applyShareState: (state: WorkspaceShareState) => void;

  setCode: (code: string) => void;
  setHyperparam: (key: string, value: number | string | boolean) => void;

  beginRun: () => number;
  appendEvent: (e: TraceEvent, token: number) => void;
  finishRun: (status: RunStatus, error: string | null, token: number) => void;

  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  stepForward: () => void;
  stepBack: () => void;
  seekTo: (i: number) => void;
  resetPlayback: () => void;
  setSpeed: (s: number) => void;
  toggleQuizMode: () => void;
}

export const useSessionStore = create<SessionState>()(
  subscribeWithSelector((set, get) => ({
    pyodideStatus: 'idle',
    pyodideProgress: '',
    pyodideStage: 'idle',

    algorithmId: null,
    datasetId: null,
    customDatasets: [],

    code: '',
    hyperparams: {},

    events: [],
    runStatus: 'idle',
    runError: null,
    runToken: 0,

    currentStep: 0,
    playing: false,
    speed: 2,
    quizMode: false,

    setPyodideStatus: (s, msg, stage) =>
      set({
        pyodideStatus: s,
        pyodideProgress: msg ?? get().pyodideProgress,
        pyodideStage:
          stage ??
          (s === 'ready'
            ? 'ready'
            : s === 'error'
              ? 'error'
              : s === 'idle'
                ? 'idle'
                : get().pyodideStage),
      }),

    setAlgorithm: (id, defaults) => {
      const hp: Record<string, number | string | boolean> = {};
      defaults.hyperparams.forEach((p) => {
        hp[p.id] = p.default;
      });
      set({
        algorithmId: id,
        code: defaults.code,
        hyperparams: hp,
        events: [],
        currentStep: 0,
        playing: false,
        runStatus: 'idle',
        runError: null,
      });
    },

    setDataset: (id) =>
      set({
        datasetId: id,
        events: [],
        currentStep: 0,
        playing: false,
        runStatus: 'idle',
        runError: null,
      }),

    addCustomDataset: (ds) =>
      set((state) => ({
        customDatasets: [...state.customDatasets.filter((d) => d.id !== ds.id), ds],
      })),

    applyShareState: (shared) =>
      set((state) => ({
        algorithmId: shared.algorithmId as AlgorithmId,
        code: shared.code,
        hyperparams: { ...shared.hyperparams },
        datasetId: shared.datasetId,
        customDatasets: shared.customDataset
          ? [
              ...state.customDatasets.filter((d) => d.id !== shared.customDataset!.id),
              shared.customDataset,
            ]
          : state.customDatasets,
        events: [],
        currentStep: 0,
        playing: false,
        runStatus: 'idle',
        runError: null,
      })),

    setCode: (code) => set({ code }),

    setHyperparam: (key, value) =>
      set({ hyperparams: { ...get().hyperparams, [key]: value } }),

    beginRun: () => {
      const token = get().runToken + 1;
      set({
        runToken: token,
        runStatus: 'running',
        runError: null,
        events: [],
        currentStep: 0,
        playing: false,
      });
      return token;
    },

    appendEvent: (event, token) => {
      if (token !== get().runToken) return;
      set((state) => ({ events: [...state.events, event] }));
    },

    finishRun: (status, error, token) => {
      if (token !== get().runToken) return;
      set({ runStatus: status, runError: error });
    },

    play: () => {
      const { events, currentStep } = get();
      if (events.length === 0) return;
      const start = currentStep >= events.length - 1 ? 0 : currentStep;
      set({ playing: true, currentStep: start });
    },
    pause: () => set({ playing: false }),
    togglePlay: () => (get().playing ? get().pause() : get().play()),

    stepForward: () => {
      const { events, currentStep } = get();
      if (currentStep < events.length - 1) {
        set({ currentStep: currentStep + 1 });
      }
    },
    stepBack: () => {
      const { currentStep } = get();
      if (currentStep > 0) set({ currentStep: currentStep - 1 });
    },
    seekTo: (i) => {
      const { events } = get();
      const clamped = Math.max(0, Math.min(events.length - 1, i));
      set({ currentStep: clamped });
    },
    resetPlayback: () => set({ currentStep: 0, playing: false }),
    setSpeed: (s) => set({ speed: Math.max(0.25, Math.min(16, s)) }),
    toggleQuizMode: () => set({ quizMode: !get().quizMode }),
  })),
);

/** Convenience selector: the trace event currently being shown. */
export const useCurrentEvent = () =>
  useSessionStore((s) => (s.events.length > 0 ? s.events[s.currentStep] : null));
