/**
 * Learning paths (curriculum) — pure data model + selectors.
 *
 * Sequences the existing per-algorithm experiences into ordered lessons so a
 * first-time visitor has a guided route through the material instead of 25
 * disconnected sandboxes. Each lesson points at a real algorithm and (when one
 * exists) the challenge that gates its completion, so "finished a lesson" is an
 * earned signal derived from the same trace-event challenges the workspace
 * already evaluates — not a participation trophy.
 *
 * This module is intentionally pure (no React, Zustand, localStorage, or
 * randomness), mirroring challenges.ts / predictions.ts: completion is passed
 * in as a Set of lesson ids, so every selector is trivially unit-testable. The
 * localStorage persistence of which lessons are done lives in the UI/store
 * layer, exactly like the predict-then-reveal streak.
 */
import type { AlgorithmId } from '@/types/algorithm';

export interface Lesson {
  /**
   * Stable, unique id (`${pathId}:${algorithmId}`). This is PERSISTED to
   * localStorage as a completion marker, so never renumber or reformat it.
   */
  id: string;
  /** The algorithm this lesson teaches; opens at `/workspace/<algorithmId>`. */
  algorithmId: AlgorithmId;
  /** Short lesson title (usually the algorithm's common name). */
  title: string;
  /** One-line framing: what the learner should walk away understanding. */
  blurb: string;
  /**
   * The challenge id (from challenges.ts) that marks this lesson complete when
   * met. Optional so the model generalises to algorithms without a challenge
   * yet; every lesson in the shipped Foundations path has one.
   */
  challengeId?: string;
}

export interface LearningPath {
  /** Stable, unique path id (persisted as a lesson-id prefix). */
  id: string;
  title: string;
  /** One-paragraph pitch shown on the home / learn surfaces. */
  summary: string;
  /** Human-readable time estimate, e.g. "~30 min". */
  estimate: string;
  /** Ordered lessons; array order IS the intended teaching sequence. */
  lessons: Lesson[];
}

function lesson(
  pathId: string,
  algorithmId: AlgorithmId,
  title: string,
  blurb: string,
  challengeId?: string,
): Lesson {
  return { id: `${pathId}:${algorithmId}`, algorithmId, title, blurb, challengeId };
}

const FOUNDATIONS_ID = 'foundations';

/**
 * The first path. Its six lessons are exactly the six algorithms that already
 * ship a challenge, sequenced along the classic intro-ML arc: fit a line, bend
 * it into a classifier, branch into trees, reason by neighbours, cluster
 * without labels, then compress with PCA. Every lesson is therefore gated by an
 * already-built, trace-event-derived challenge.
 */
const FOUNDATIONS: LearningPath = {
  id: FOUNDATIONS_ID,
  title: 'Foundations of ML',
  summary:
    'Six hands-on lessons that walk the classic machine-learning arc — fit a line, ' +
    'turn it into a classifier, branch into trees, reason by neighbours, cluster ' +
    'without labels, then compress with PCA. Every lesson runs real Python in your ' +
    'browser and is complete when you beat its challenge.',
  estimate: '~30 min',
  lessons: [
    lesson(
      FOUNDATIONS_ID,
      'linreg',
      'Linear Regression',
      'Fit a line with gradient descent and watch the loss fall — the bedrock every other model builds on.',
      'linreg-converge-30',
    ),
    lesson(
      FOUNDATIONS_ID,
      'logreg',
      'Logistic Regression',
      'Bend that line into a decision boundary and read calibrated probabilities out of a classifier.',
      'logreg-accuracy-90',
    ),
    lesson(
      FOUNDATIONS_ID,
      'dtree',
      'Decision Trees',
      'Split the feature space with yes/no questions — expressive, and quick to overfit if you let it.',
      'dtree-compact-12',
    ),
    lesson(
      FOUNDATIONS_ID,
      'knn',
      'k-Nearest Neighbours',
      'Classify by letting the closest examples vote — accurate with no training loop at all.',
      'knn-accuracy-92',
    ),
    lesson(
      FOUNDATIONS_ID,
      'kmeans',
      'k-Means Clustering',
      'Discover structure with zero labels by iterating centroids until they stop moving.',
      'kmeans-converge-8',
    ),
    lesson(
      FOUNDATIONS_ID,
      'pca',
      'Principal Component Analysis',
      'Squeeze high-dimensional data onto two axes while keeping most of the variance intact.',
      'pca-variance-85',
    ),
  ],
};

/** All learning paths, in display order. */
export const LEARNING_PATHS: LearningPath[] = [FOUNDATIONS];

const PATH_BY_ID = new Map<string, LearningPath>(LEARNING_PATHS.map((p) => [p.id, p]));
const LESSON_BY_ID = new Map<string, Lesson>(
  LEARNING_PATHS.flatMap((p) => p.lessons).map((l) => [l.id, l]),
);

// Reverse indices for the workspace bridges: a met challenge → the lesson it
// completes, and an opened algorithm → the lesson(s) that teach it.
const LESSON_BY_CHALLENGE = new Map<string, Lesson>();
const LESSONS_BY_ALGORITHM = new Map<AlgorithmId, Lesson[]>();
for (const l of LESSON_BY_ID.values()) {
  if (l.challengeId && !LESSON_BY_CHALLENGE.has(l.challengeId)) {
    LESSON_BY_CHALLENGE.set(l.challengeId, l);
  }
  const forAlgo = LESSONS_BY_ALGORITHM.get(l.algorithmId) ?? [];
  forAlgo.push(l);
  LESSONS_BY_ALGORITHM.set(l.algorithmId, forAlgo);
}

/** All defined learning paths (stable order). */
export function listLearningPaths(): LearningPath[] {
  return LEARNING_PATHS;
}

/** A path by id, or undefined when unknown. */
export function getLearningPath(id: string): LearningPath | undefined {
  return PATH_BY_ID.get(id);
}

/** Every lesson across every path (stable order). */
export function allLessons(): Lesson[] {
  return [...LESSON_BY_ID.values()];
}

/** A lesson by id across all paths, or undefined when unknown. */
export function findLesson(lessonId: string): Lesson | undefined {
  return LESSON_BY_ID.get(lessonId);
}

/**
 * The lesson a given challenge id completes, or undefined. Used by the
 * workspace to promote a met challenge into lesson completion.
 */
export function lessonForChallenge(challengeId: string): Lesson | undefined {
  return LESSON_BY_CHALLENGE.get(challengeId);
}

/** Lessons that teach a given algorithm across all paths (stable order). */
export function lessonsForAlgorithm(algorithmId: AlgorithmId): Lesson[] {
  return LESSONS_BY_ALGORITHM.get(algorithmId) ?? [];
}

/** The workspace route a lesson opens. */
export function lessonWorkspacePath(lesson: Lesson): string {
  return `/workspace/${lesson.algorithmId}`;
}

export interface PathProgress {
  /** Number of completed lessons in the path. */
  done: number;
  /** Total lessons in the path. */
  total: number;
  /** Completion fraction in [0, 1]. */
  fraction: number;
  /** True only when every lesson is complete (and the path is non-empty). */
  complete: boolean;
}

/** Completion stats for a single path given the set of completed lesson ids. */
export function pathProgress(
  path: LearningPath,
  completed: ReadonlySet<string>,
): PathProgress {
  const total = path.lessons.length;
  let done = 0;
  for (const l of path.lessons) if (completed.has(l.id)) done += 1;
  return {
    done,
    total,
    fraction: total === 0 ? 0 : done / total,
    complete: total > 0 && done === total,
  };
}

/**
 * The first not-yet-completed lesson in teaching order, or null when the whole
 * path is complete. Drives the "Continue" / "Start" call-to-action.
 */
export function nextLesson(
  path: LearningPath,
  completed: ReadonlySet<string>,
): Lesson | null {
  return path.lessons.find((l) => !completed.has(l.id)) ?? null;
}
