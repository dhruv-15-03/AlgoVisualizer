/**
 * Pure mapping from a Pyodide load stage to a determinate progress indicator.
 *
 * The worker reports discrete phases (runtime download → numpy → ready) rather
 * than a continuous byte count, so we map each phase onto a representative
 * percentage. This keeps the loading UI determinate-looking ("Downloading
 * Python… 35%") instead of an opaque indeterminate spinner, while staying
 * honest about which phase is actually in flight.
 *
 * Kept side-effect free and decoupled from React/Zustand so it can be unit
 * tested directly.
 */

export type PyodideStage =
  | 'idle'
  | 'loading-runtime'
  | 'loading-numpy'
  | 'ready'
  | 'error';

export interface PyodideProgressInfo {
  stage: PyodideStage;
  /** 0–100, monotonically increasing across the happy path. */
  percent: number;
  /** Short human label for the current phase. */
  label: string;
  /** True while still working toward `ready` (drives spinner vs. static bar). */
  active: boolean;
}

const STAGE_TABLE: Record<PyodideStage, { percent: number; label: string }> = {
  idle: { percent: 0, label: 'Preparing…' },
  'loading-runtime': { percent: 35, label: 'Downloading Python…' },
  'loading-numpy': { percent: 75, label: 'Loading NumPy…' },
  ready: { percent: 100, label: 'Ready' },
  error: { percent: 100, label: 'Failed to load' },
};

/** Ordered happy-path stages, used to validate/normalize incoming values. */
export const PYODIDE_STAGE_ORDER: PyodideStage[] = [
  'idle',
  'loading-runtime',
  'loading-numpy',
  'ready',
];

export function isPyodideStage(value: unknown): value is PyodideStage {
  return (
    value === 'idle' ||
    value === 'loading-runtime' ||
    value === 'loading-numpy' ||
    value === 'ready' ||
    value === 'error'
  );
}

/**
 * Map a worker init stage to determinate progress info. Unknown values fall
 * back to `idle` so a malformed message can never blank out the UI.
 */
export function pyodideLoadProgress(stage: PyodideStage): PyodideProgressInfo {
  const safe: PyodideStage = isPyodideStage(stage) ? stage : 'idle';
  const { percent, label } = STAGE_TABLE[safe];
  return {
    stage: safe,
    percent,
    label,
    active: safe !== 'ready' && safe !== 'error',
  };
}
