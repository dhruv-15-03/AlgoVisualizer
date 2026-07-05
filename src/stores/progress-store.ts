/**
 * Progress store — the persistent record of which lessons a learner has
 * completed and visited. This is the cross-session return hook: unlike the
 * session store (one workspace, wiped on reload) this survives reloads via
 * localStorage.
 *
 * Completion is EARNED — a lesson is marked complete when its challenge is met
 * (wired by LessonProgressBridge in the workspace), not merely by opening it.
 * "Visited" is the softer signal (opened at least once) and is tracked in
 * parallel so the UI can later distinguish "seen" from "mastered" without a
 * storage migration. Components read the raw `completed` Set and feed it to the
 * pure curriculum selectors (pathProgress / nextLesson).
 */
import { create } from 'zustand';
import { loadProgress, saveCompleted, saveVisited } from '@/lib/progress';

interface ProgressState {
  /** Earned lesson ids (challenge met). Referentially stable across no-ops. */
  completed: Set<string>;
  /** Opened-at-least-once lesson ids. */
  visited: Set<string>;
  /** Mark a lesson earned + persist. No-op (no re-render) if already complete. */
  markCompleted: (lessonId: string) => void;
  /** Mark a lesson opened + persist. No-op if already visited. */
  markVisited: (lessonId: string) => void;
  /** Convenience predicate (does not subscribe; use the Set for reactivity). */
  isCompleted: (lessonId: string) => boolean;
  /** Clear all progress (both sets + storage). */
  reset: () => void;
}

const initial = loadProgress();

export const useProgressStore = create<ProgressState>((set, get) => ({
  completed: initial.completed,
  visited: initial.visited,

  markCompleted: (lessonId) => {
    const current = get().completed;
    if (current.has(lessonId)) return;
    const next = new Set(current);
    next.add(lessonId);
    saveCompleted(next);
    set({ completed: next });
  },

  markVisited: (lessonId) => {
    const current = get().visited;
    if (current.has(lessonId)) return;
    const next = new Set(current);
    next.add(lessonId);
    saveVisited(next);
    set({ visited: next });
  },

  isCompleted: (lessonId) => get().completed.has(lessonId),

  reset: () => {
    const empty = new Set<string>();
    saveCompleted(empty);
    saveVisited(empty);
    set({ completed: new Set(), visited: new Set() });
  },
}));
