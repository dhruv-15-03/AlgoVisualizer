/**
 * Learner progress persistence (pure I/O helpers).
 *
 * Which lessons a learner has completed / visited is the return-tomorrow hook,
 * so it must survive reloads. This module is the ONLY place that touches
 * localStorage for lesson progress; the store layer calls in here to hydrate
 * and persist. It is kept free of React/Zustand and defensively guarded
 * (SSR-safe, quota/parse failures swallowed) so it can be unit-tested against a
 * fake storage and never throws into the app — the same contract consent.ts and
 * the predict-then-reveal streak follow.
 */

const COMPLETED_KEY = 'algoviz:lesson-completed';
const VISITED_KEY = 'algoviz:lesson-visited';

/** The localStorage keys this module owns (exported for tests/debugging). */
export const PROGRESS_KEYS = { completed: COMPLETED_KEY, visited: VISITED_KEY } as const;

export interface StoredProgress {
  /** Lesson ids the learner has EARNED (challenge met). */
  completed: Set<string>;
  /** Lesson ids the learner has merely opened at least once. */
  visited: Set<string>;
}

function storage(): Storage | undefined {
  try {
    // Access itself can throw in sandboxed iframes / disabled-storage modes.
    return typeof window !== 'undefined' ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}

function readSet(key: string): Set<string> {
  const s = storage();
  if (!s) return new Set();
  try {
    const raw = s.getItem(key);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is string => typeof v === 'string'));
  } catch {
    return new Set();
  }
}

function writeSet(key: string, value: ReadonlySet<string>): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(key, JSON.stringify([...value]));
  } catch {
    // Local-only nicety; ignore quota/availability failures silently.
  }
}

/** Hydrate both progress sets from storage (empty sets when unavailable). */
export function loadProgress(): StoredProgress {
  return { completed: readSet(COMPLETED_KEY), visited: readSet(VISITED_KEY) };
}

/** Persist the completed-lesson set. */
export function saveCompleted(value: ReadonlySet<string>): void {
  writeSet(COMPLETED_KEY, value);
}

/** Persist the visited-lesson set. */
export function saveVisited(value: ReadonlySet<string>): void {
  writeSet(VISITED_KEY, value);
}
