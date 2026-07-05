import { useEffect, useMemo } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { challengesFor, type ChallengeOutcome } from '@/lib/challenges';
import type { TraceEvent } from '@/types/trace';
import { lessonForChallenge, lessonsForAlgorithm } from '@/lib/curriculum';
import { useProgressStore } from '@/stores/progress-store';

/**
 * Headless bridge that promotes workspace activity into persistent lesson
 * progress — the return hook that makes Learning Paths more than a static list.
 *
 *   - Opening an algorithm a lesson teaches marks that lesson VISITED.
 *   - Beating that algorithm's challenge marks the lesson COMPLETED.
 *
 * Completion is therefore EARNED from the same trace-event challenge the
 * ChallengeChip already evaluates, not granted for merely opening the page.
 * Mounted once at the workspace root so it stays active across panes/tabs and
 * renders nothing itself.
 */
export function LessonProgressBridge() {
  const algorithmId = useSessionStore((s) => s.algorithmId);
  const events = useSessionStore((s) => s.events);
  const markVisited = useProgressStore((s) => s.markVisited);
  const markCompleted = useProgressStore((s) => s.markCompleted);

  // Mark every lesson teaching the open algorithm as visited.
  useEffect(() => {
    if (!algorithmId) return;
    for (const lesson of lessonsForAlgorithm(algorithmId)) {
      markVisited(lesson.id);
    }
  }, [algorithmId, markVisited]);

  const challenge = algorithmId ? challengesFor(algorithmId)[0] : undefined;
  const outcome = useMemo<ChallengeOutcome | null>(
    () => (challenge ? challenge.evaluate(events as TraceEvent[]) : null),
    [challenge, events],
  );

  // Promote a met challenge into lesson completion (idempotent in the store).
  useEffect(() => {
    if (!challenge || outcome?.status !== 'met') return;
    const lesson = lessonForChallenge(challenge.id);
    if (lesson) markCompleted(lesson.id);
  }, [challenge, outcome, markCompleted]);

  return null;
}
