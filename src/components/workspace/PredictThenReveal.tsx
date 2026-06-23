import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useSessionStore } from '@/stores/session-store';
import { getAlgorithm } from '@/algorithms/registry';
import { runNow } from '@/controllers/training-controller';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { predictionFor, scorePrediction, type PredictionScore } from '@/lib/predictions';
import type { TraceEvent } from '@/types/trace';

/**
 * Predict-then-reveal (Tier 11) — turns passive watching into active learning.
 *
 * Ambient and fully opt-in, mirroring ChallengeChip: a learner who ignores it
 * sees no change and Run behaves exactly as before. When engaged, the learner
 * picks a quick guess, hits "Run & reveal" (which triggers the run so they
 * can't peek first), and on completion we score the guess against the REAL
 * emitted trace value and keep a local streak. Renders nothing for algorithms
 * with no defined prediction.
 */

interface Streak {
  current: number;
  best: number;
}

const STREAK_KEY = 'algoviz:predict-streak';

function readStreak(): Streak {
  if (typeof window === 'undefined') return { current: 0, best: 0 };
  try {
    const raw = window.localStorage.getItem(STREAK_KEY);
    if (!raw) return { current: 0, best: 0 };
    const parsed = JSON.parse(raw) as Partial<Streak>;
    return {
      current: Number.isFinite(parsed.current) ? Number(parsed.current) : 0,
      best: Number.isFinite(parsed.best) ? Number(parsed.best) : 0,
    };
  } catch {
    return { current: 0, best: 0 };
  }
}

function writeStreak(streak: Streak): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
  } catch {
    // Local-only nicety; ignore quota/availability failures silently.
  }
}

export function PredictThenReveal() {
  const algorithmId = useSessionStore((s) => s.algorithmId);
  const datasetId = useSessionStore((s) => s.datasetId);
  const events = useSessionStore((s) => s.events);
  const runStatus = useSessionStore((s) => s.runStatus);
  const reduceMotion = usePrefersReducedMotion();

  const spec = useMemo(() => {
    const meta = algorithmId ? getAlgorithm(algorithmId) : null;
    return meta ? predictionFor(meta) : null;
  }, [algorithmId]);

  const [engaged, setEngaged] = useState(false);
  const [choice, setChoice] = useState<string | null>(null);
  const [locked, setLocked] = useState<string | null>(null);
  const [score, setScore] = useState<PredictionScore | null>(null);
  const [noResult, setNoResult] = useState(false);
  const [streak, setStreak] = useState<Streak>(() => readStreak());

  // New algorithm or dataset = a fresh context: forget any pending prediction.
  useEffect(() => {
    setEngaged(false);
    setChoice(null);
    setLocked(null);
    setScore(null);
    setNoResult(false);
  }, [algorithmId, datasetId]);

  // Reveal once the run we kicked off finishes successfully.
  useEffect(() => {
    if (!spec || runStatus !== 'success' || locked === null || score !== null || noResult) return;
    const result = scorePrediction(spec, locked, events as TraceEvent[]);
    if (result) {
      setScore(result);
      setStreak((prev) => {
        const nextCurrent = result.correct ? prev.current + 1 : 0;
        const next: Streak = { current: nextCurrent, best: Math.max(prev.best, nextCurrent) };
        writeStreak(next);
        return next;
      });
    } else {
      setNoResult(true);
    }
  }, [spec, runStatus, locked, score, noResult, events]);

  if (!spec) return null;

  const fade = reduceMotion ? '' : 'animate-fade-in';

  const reset = () => {
    setChoice(null);
    setLocked(null);
    setScore(null);
    setNoResult(false);
  };

  const runAndReveal = () => {
    if (choice === null) return;
    setLocked(choice);
    setScore(null);
    setNoResult(false);
    runNow();
  };

  // ── Collapsed: a single opt-in affordance ──────────────────────────────
  if (!engaged) {
    return (
      <button
        type="button"
        onClick={() => setEngaged(true)}
        className={
          'flex w-full items-center gap-2 rounded-lg border border-ink-700/60 bg-ink-800/40 px-2.5 py-1.5 text-left transition-colors hover:border-ink-600 hover:bg-ink-800/70 ' +
          fade
        }
      >
        <Icon name="quiz" size={14} className="shrink-0 text-family-text" />
        <span className="text-[11px] font-semibold text-ink-100">Predict the outcome</span>
        <span className="text-[10px] text-ink-400">{spec.question}</span>
        {streak.current > 0 && (
          <span className="ml-auto shrink-0 rounded-full bg-ink-700/60 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-ink-200">
            {streak.current} streak
          </span>
        )}
      </button>
    );
  }

  // ── Revealed: hit / miss + the real value ──────────────────────────────
  if (score) {
    const { correct, resolution } = score;
    const guess = spec.choices.find((c) => c.id === locked)?.label ?? '—';
    return (
      <div
        role="status"
        aria-live="polite"
        className={
          'flex flex-col gap-1.5 rounded-lg border px-2.5 py-2 ' +
          (correct ? 'border-ok/40 bg-ok/10 ' : 'border-warn/40 bg-warn/10 ') +
          fade
        }
      >
        <div className="flex items-center gap-2">
          <Icon
            name={correct ? 'check_circle' : 'close'}
            size={14}
            fill={correct}
            className={correct ? 'text-ok' : 'text-warn'}
          />
          <span className="text-[11px] font-semibold text-ink-100">
            {correct ? 'Nice — you got it' : 'Not quite'}
          </span>
          <span className="ml-auto shrink-0 rounded-full bg-ink-700/60 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-ink-200">
            {streak.current} streak{streak.best > streak.current ? ` · best ${streak.best}` : ''}
          </span>
        </div>
        <div className="text-[10px] text-ink-300">
          You guessed <span className="font-semibold text-ink-100">{guess}</span> · actual:{' '}
          <span className="font-semibold text-ink-100">{resolution.actualLabel}</span>
        </div>
        <div className="text-[10px] leading-snug text-ink-400">{resolution.explanation}</div>
        <button
          type="button"
          onClick={reset}
          className="mt-0.5 inline-flex w-fit items-center gap-1 rounded-md border border-ink-700/60 px-2 py-1 text-[10px] font-semibold text-ink-200 transition-colors hover:border-ink-600 hover:text-ink-100"
        >
          <Icon name="restart_alt" size={12} />
          Predict again
        </button>
      </div>
    );
  }

  // ── Locked, waiting for the run to finish ──────────────────────────────
  if (locked !== null) {
    if (noResult) {
      return (
        <div className={'flex flex-col gap-1.5 rounded-lg border border-ink-700/60 bg-ink-800/40 px-2.5 py-2 ' + fade}>
          <span className="text-[11px] font-semibold text-ink-100">No result to score</span>
          <span className="text-[10px] text-ink-400">This run didn&apos;t produce a measurable outcome.</span>
          <button
            type="button"
            onClick={reset}
            className="mt-0.5 inline-flex w-fit items-center gap-1 rounded-md border border-ink-700/60 px-2 py-1 text-[10px] font-semibold text-ink-200 transition-colors hover:border-ink-600 hover:text-ink-100"
          >
            <Icon name="restart_alt" size={12} />
            Try again
          </button>
        </div>
      );
    }
    const guess = spec.choices.find((c) => c.id === locked)?.label ?? '—';
    return (
      <div className={'flex items-center gap-2 rounded-lg border border-ink-700/60 bg-ink-800/40 px-2.5 py-2 ' + fade}>
        <Icon name="hourglass_top" size={14} className="shrink-0 text-family-text" />
        <span className="text-[11px] text-ink-300">
          Locked in <span className="font-semibold text-ink-100">{guess}</span> — revealing when the run finishes…
        </span>
      </div>
    );
  }

  // ── Engaged: pick a guess ──────────────────────────────────────────────
  return (
    <div
      role="group"
      aria-label="Predict the outcome"
      className={'flex flex-col gap-2 rounded-lg border border-ink-700/60 bg-ink-800/40 px-2.5 py-2 ' + fade}
    >
      <div className="flex items-center gap-2">
        <Icon name="quiz" size={14} className="shrink-0 text-family-text" />
        <span className="text-[11px] font-semibold text-ink-100">{spec.question}</span>
        <button
          type="button"
          onClick={() => {
            setEngaged(false);
            reset();
          }}
          aria-label="Dismiss prediction"
          className="ml-auto shrink-0 rounded p-0.5 text-ink-400 transition-colors hover:text-ink-200"
        >
          <Icon name="close" size={14} />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {spec.choices.map((c) => {
          const selected = choice === c.id;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setChoice(c.id)}
              className={
                'rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors ' +
                (selected
                  ? 'border-family-text bg-family-text/15 text-ink-50'
                  : 'border-ink-700/60 text-ink-300 hover:border-ink-600 hover:text-ink-100')
              }
            >
              {c.label}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={runAndReveal}
        disabled={choice === null}
        className="inline-flex w-fit items-center gap-1.5 rounded-md bg-accent-500 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Icon name="play_arrow" size={14} fill />
        Run &amp; reveal
      </button>
    </div>
  );
}
