import { describe, it, expect } from 'vitest';
import {
  LEARNING_PATHS,
  listLearningPaths,
  getLearningPath,
  allLessons,
  findLesson,
  lessonForChallenge,
  lessonsForAlgorithm,
  lessonWorkspacePath,
  pathProgress,
  nextLesson,
  type LearningPath,
} from '@/lib/curriculum';
import { getAlgorithm } from '@/algorithms/registry';
import { listChallenges, challengesFor } from '@/lib/challenges';

const foundations = getLearningPath('foundations') as LearningPath;

describe('curriculum — integrity', () => {
  it('exposes at least one path via the stable accessor', () => {
    expect(listLearningPaths()).toBe(LEARNING_PATHS);
    expect(LEARNING_PATHS.length).toBeGreaterThan(0);
  });

  it('has unique path ids', () => {
    const ids = LEARNING_PATHS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has globally unique lesson ids following the `${pathId}:${algorithmId}` shape', () => {
    const lessons = allLessons();
    const ids = lessons.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const path of LEARNING_PATHS) {
      for (const l of path.lessons) {
        expect(l.id).toBe(`${path.id}:${l.algorithmId}`);
      }
    }
  });

  it('carries non-empty copy on every path and lesson', () => {
    for (const path of LEARNING_PATHS) {
      expect(path.title.trim().length).toBeGreaterThan(0);
      expect(path.summary.trim().length).toBeGreaterThan(0);
      expect(path.estimate.trim().length).toBeGreaterThan(0);
      expect(path.lessons.length).toBeGreaterThan(0);
      for (const l of path.lessons) {
        expect(l.title.trim().length).toBeGreaterThan(0);
        expect(l.blurb.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe('curriculum — drift guards against the real registries', () => {
  it('references only real algorithms', () => {
    for (const l of allLessons()) {
      // getAlgorithm throws/returns undefined for an unknown id; assert it resolves.
      expect(getAlgorithm(l.algorithmId), `unknown algorithm ${l.algorithmId}`).toBeDefined();
    }
  });

  it('references only real challenges that belong to the lesson algorithm', () => {
    const challengeIds = new Set(listChallenges().map((c) => c.id));
    for (const l of allLessons()) {
      if (!l.challengeId) continue;
      expect(challengeIds.has(l.challengeId), `unknown challenge ${l.challengeId}`).toBe(true);
      const owned = challengesFor(l.algorithmId).some((c) => c.id === l.challengeId);
      expect(owned, `${l.challengeId} does not belong to ${l.algorithmId}`).toBe(true);
    }
  });

  it('lessonWorkspacePath points at the lesson algorithm route', () => {
    for (const l of allLessons()) {
      expect(lessonWorkspacePath(l)).toBe(`/workspace/${l.algorithmId}`);
    }
  });
});

describe('curriculum — Foundations path shape', () => {
  it('sequences the six challenge-backed algorithms in the intended order', () => {
    expect(foundations.lessons.map((l) => l.algorithmId)).toEqual([
      'linreg',
      'logreg',
      'dtree',
      'knn',
      'kmeans',
      'pca',
    ]);
    // Every Foundations lesson is challenge-gated.
    for (const l of foundations.lessons) {
      expect(l.challengeId, `${l.id} should be challenge-gated`).toBeTruthy();
    }
  });
});

describe('curriculum — selectors', () => {
  it('pathProgress reports 0 / total for an empty completion set', () => {
    const p = pathProgress(foundations, new Set());
    expect(p.done).toBe(0);
    expect(p.total).toBe(foundations.lessons.length);
    expect(p.fraction).toBe(0);
    expect(p.complete).toBe(false);
  });

  it('pathProgress counts partial completion', () => {
    const done = new Set([foundations.lessons[0].id, foundations.lessons[1].id]);
    const p = pathProgress(foundations, done);
    expect(p.done).toBe(2);
    expect(p.fraction).toBeCloseTo(2 / foundations.lessons.length);
    expect(p.complete).toBe(false);
  });

  it('pathProgress reports complete only when every lesson is done', () => {
    const all = new Set(foundations.lessons.map((l) => l.id));
    const p = pathProgress(foundations, all);
    expect(p.done).toBe(foundations.lessons.length);
    expect(p.fraction).toBe(1);
    expect(p.complete).toBe(true);
  });

  it('ignores unrelated ids in the completion set', () => {
    const p = pathProgress(foundations, new Set(['foundations:not-a-lesson', 'garbage']));
    expect(p.done).toBe(0);
  });

  it('nextLesson returns the first lesson when nothing is done', () => {
    expect(nextLesson(foundations, new Set())?.id).toBe(foundations.lessons[0].id);
  });

  it('nextLesson skips completed lessons in order', () => {
    const done = new Set([foundations.lessons[0].id]);
    expect(nextLesson(foundations, done)?.id).toBe(foundations.lessons[1].id);
  });

  it('nextLesson returns null once the path is complete', () => {
    const all = new Set(foundations.lessons.map((l) => l.id));
    expect(nextLesson(foundations, all)).toBeNull();
  });
});

describe('curriculum — lookups', () => {
  it('findLesson resolves a known id and rejects junk', () => {
    expect(findLesson(foundations.lessons[0].id)?.algorithmId).toBe('linreg');
    expect(findLesson('nope')).toBeUndefined();
  });

  it('getLearningPath resolves a known id and rejects junk', () => {
    expect(getLearningPath('foundations')?.id).toBe('foundations');
    expect(getLearningPath('nope')).toBeUndefined();
  });
});

describe('curriculum — reverse lookups', () => {
  it('lessonForChallenge maps every challenge-gated lesson back to itself', () => {
    for (const l of allLessons()) {
      if (!l.challengeId) continue;
      expect(lessonForChallenge(l.challengeId)?.id).toBe(l.id);
    }
    expect(lessonForChallenge('nonexistent-challenge')).toBeUndefined();
  });

  it('lessonsForAlgorithm returns the lessons teaching that algorithm', () => {
    expect(lessonsForAlgorithm('linreg').map((l) => l.id)).toContain('foundations:linreg');
    expect(lessonsForAlgorithm('tsne')).toEqual([]);
  });
});
