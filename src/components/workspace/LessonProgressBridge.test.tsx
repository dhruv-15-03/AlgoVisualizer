import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LessonProgressBridge } from '@/components/workspace/LessonProgressBridge';
import { useSessionStore } from '@/stores/session-store';
import { useProgressStore } from '@/stores/progress-store';
import type { Challenge, ChallengeOutcome } from '@/lib/challenges';
import type { TraceEvent } from '@/types/trace';

// Controllable challenge outcome. Must be `mock`-prefixed to be referenced
// inside the hoisted vi.mock factory.
let mockOutcomeStatus: ChallengeOutcome['status'] = 'pending';

vi.mock('@/lib/challenges', () => ({
  challengesFor: (algorithmId: string): Challenge[] =>
    algorithmId === 'linreg'
      ? [
          {
            id: 'linreg-converge-30',
            algorithmId: 'linreg',
            title: 't',
            description: 'd',
            evaluate: (): ChallengeOutcome => ({
              status: mockOutcomeStatus,
              progress: mockOutcomeStatus === 'met' ? 1 : 0.5,
              detail: '',
              target: 30,
            }),
          } as Challenge,
        ]
      : [],
}));

beforeEach(() => {
  localStorage.clear();
  useProgressStore.getState().reset();
  useSessionStore.setState({ algorithmId: null, events: [] });
  mockOutcomeStatus = 'pending';
});

describe('LessonProgressBridge', () => {
  it('marks the lesson visited when its algorithm is open (not completed)', () => {
    useSessionStore.setState({ algorithmId: 'linreg', events: [] });
    render(<LessonProgressBridge />);
    expect(useProgressStore.getState().visited.has('foundations:linreg')).toBe(true);
    expect(useProgressStore.getState().isCompleted('foundations:linreg')).toBe(false);
  });

  it('marks the lesson completed when the challenge is met', () => {
    mockOutcomeStatus = 'met';
    useSessionStore.setState({ algorithmId: 'linreg', events: [{}] as unknown as TraceEvent[] });
    render(<LessonProgressBridge />);
    expect(useProgressStore.getState().isCompleted('foundations:linreg')).toBe(true);
  });

  it('does not complete a lesson while the challenge is unmet', () => {
    mockOutcomeStatus = 'unmet';
    useSessionStore.setState({ algorithmId: 'linreg', events: [{}] as unknown as TraceEvent[] });
    render(<LessonProgressBridge />);
    expect(useProgressStore.getState().isCompleted('foundations:linreg')).toBe(false);
    expect(useProgressStore.getState().visited.has('foundations:linreg')).toBe(true);
  });
});
