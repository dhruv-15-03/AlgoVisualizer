import { useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useSessionStore } from '@/stores/session-store';
import { challengesFor, type ChallengeOutcome } from '@/lib/challenges';
import type { TraceEvent } from '@/types/trace';

/**
 * Compact per-algorithm challenge readout. Looks up the goal for the active
 * algorithm, evaluates it against the current trace (pure), and shows progress.
 * Renders nothing when the algorithm has no challenge or nothing is measured yet
 * (status 'pending'), so it stays out of the way until a run produces signal.
 */
export function ChallengeChip() {
  const algorithmId = useSessionStore((s) => s.algorithmId);
  const events = useSessionStore((s) => s.events);

  const challenge = algorithmId ? challengesFor(algorithmId)[0] : undefined;
  const outcome = useMemo<ChallengeOutcome | null>(
    () => (challenge ? challenge.evaluate(events as TraceEvent[]) : null),
    [challenge, events],
  );

  if (!challenge || !outcome || outcome.status === 'pending') return null;

  const met = outcome.status === 'met';
  const pct = Math.round(outcome.progress * 100);

  return (
    <div
      className={
        'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ' +
        (met
          ? 'border-ok/40 bg-ok/10'
          : 'border-ink-700/60 bg-ink-800/40')
      }
      title={challenge.description}
    >
      <Icon
        name={met ? 'check_circle' : 'flag'}
        size={14}
        fill={met}
        className={met ? 'text-ok' : 'text-family-text'}
      />
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-[11px] font-semibold text-ink-100">
          {challenge.title}
        </span>
        <span className="truncate text-[10px] text-ink-400">{outcome.detail}</span>
      </div>
      <span
        className={
          'ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ' +
          (met ? 'bg-ok/20 text-ok' : 'bg-ink-700/60 text-ink-300')
        }
      >
        {met ? 'Goal met' : `${pct}%`}
      </span>
    </div>
  );
}
