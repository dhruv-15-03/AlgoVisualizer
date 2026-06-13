import { useMemo, useState, useEffect, useRef } from 'react';
import { BlockMath } from 'react-katex';
import { Panel } from '@/components/ui/Panel';
import { Icon } from '@/components/ui/Icon';
import { VizRouter } from '@/visualizations/VizRouter';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ExplainErrorPanel } from '@/components/workspace/ExplainErrorPanel';
import { ExportPngButton } from '@/components/workspace/ExportPngButton';
import { ConvergenceCelebration } from '@/components/workspace/ConvergenceCelebration';
import { useSessionStore, useCurrentEvent } from '@/stores/session-store';
import { getAlgorithm } from '@/algorithms/registry';
import { getDataset } from '@/datasets/registry';
import { familyOf } from '@/types/trace';
import { runNow } from '@/controllers/training-controller';
import { pyodideLoadProgress, type PyodideStage } from '@/lib/pyodide-progress';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { factAt, factCount } from '@/lib/ml-facts';

const LOADING_STEPS: { stage: PyodideStage; label: string }[] = [
  { stage: 'loading-runtime', label: 'Download Python' },
  { stage: 'loading-numpy', label: 'Load NumPy' },
  { stage: 'ready', label: 'Ready' },
];

function LoadingState({ stage, message }: { stage: PyodideStage; message: string }) {
  const progress = pyodideLoadProgress(stage);
  const reachedIndex = LOADING_STEPS.findIndex((s) => s.stage === stage);
  const reduceMotion = usePrefersReducedMotion();
  const [factIdx, setFactIdx] = useState(() => Math.floor(Math.random() * factCount()));

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(() => setFactIdx((i) => i + 1), 5200);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  const fact = factAt(factIdx);

  return (
    <div className="grid h-full place-items-center p-4">
      <div className="flex w-full max-w-xs flex-col items-center gap-4 text-center">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full border-2 border-ink-700" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-accent-400" />
        </div>

        <div className="w-full">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-sm font-medium text-ink-200">
              {message || progress.label}
            </span>
            <span className="font-mono text-[11px] text-ink-400">{progress.percent}%</span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-ink-700"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.percent}
            aria-label="Python runtime loading progress"
          >
            <div
              className="h-full rounded-full bg-accent-400 transition-[width] duration-500 ease-out"
              style={{ width: `${progress.percent}%` }}
            />
          </div>

          <ol className="mt-3 flex items-center justify-between gap-1">
            {LOADING_STEPS.map((s, i) => {
              const done = reachedIndex > i || stage === 'ready';
              const active = reachedIndex === i && stage !== 'ready';
              return (
                <li
                  key={s.stage}
                  className={
                    'flex items-center gap-1 text-[10px] ' +
                    (done
                      ? 'text-accent-300'
                      : active
                        ? 'text-ink-200'
                        : 'text-ink-500')
                  }
                >
                  <Icon
                    name={done ? 'check_circle' : active ? 'sync' : 'radio_button_unchecked'}
                    size={12}
                    fill={done}
                  />
                  {s.label}
                </li>
              );
            })}
          </ol>
        </div>

        <div
          key={reduceMotion ? 'static' : factIdx}
          className={
            'flex w-full items-start gap-2 rounded-lg border border-ink-700/60 bg-ink-800/40 px-3 py-2 text-left ' +
            (reduceMotion ? '' : 'animate-fade-in')
          }
        >
          <Icon name="lightbulb" size={14} className="mt-0.5 shrink-0 text-family-text" fill />
          <p className="text-[11px] leading-snug text-ink-300" aria-live="off">
            {fact}
          </p>
        </div>

        <div className="text-[11px] text-ink-500">
          First load downloads the ~10MB Python runtime; it&apos;s cached so repeat
          visits are near-instant.
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message, showRun }: { message: string; showRun?: boolean }) {
  return (
    <div className="grid h-full place-items-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="text-sm text-ink-300">{message}</div>
        {showRun && (
          <button
            onClick={() => runNow()}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-400"
          >
            <Icon name="play_arrow" size={14} fill />
            Run now
          </button>
        )}
      </div>
    </div>
  );
}

export function VizPanel() {
  const algorithmId = useSessionStore((s) => s.algorithmId);
  const datasetId = useSessionStore((s) => s.datasetId);
  const events = useSessionStore((s) => s.events);
  const currentStep = useSessionStore((s) => s.currentStep);
  const runStatus = useSessionStore((s) => s.runStatus);
  const runError = useSessionStore((s) => s.runError);
  const pyodideStatus = useSessionStore((s) => s.pyodideStatus);
  const pyodideProgress = useSessionStore((s) => s.pyodideProgress);
  const pyodideStage = useSessionStore((s) => s.pyodideStage);
  const seekTo = useSessionStore((s) => s.seekTo);
  const event = useCurrentEvent();
  const vizContainerRef = useRef<HTMLDivElement | null>(null);

  const algorithm = algorithmId ? getAlgorithm(algorithmId) : null;
  const dataset = datasetId ? getDataset(datasetId) : null;

  const headerSubtitle = useMemo(() => {
    if (!algorithm || !dataset) return '';
    return `${algorithm.name} on ${dataset.name}`;
  }, [algorithm, dataset]);

  let body: React.ReactNode;
  if (pyodideStatus === 'loading' || pyodideStatus === 'idle') {
    body = <LoadingState stage={pyodideStage} message={pyodideProgress} />;
  } else if (pyodideStatus === 'error') {
    body = (
      <div className="grid h-full place-items-center p-4">
        <div className="max-w-md text-center">
          <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-300">
            <Icon name="error_outline" size={16} />
            Python failed to load
          </div>
          <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-rose-500/10 p-3 text-left text-[11px] text-rose-200">
            {pyodideProgress}
          </pre>
        </div>
      </div>
    );
  } else if (runStatus === 'error') {
    body = (
      <div className="grid h-full place-items-center p-4">
        <div className="w-full max-w-lg text-center">
          <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-300">
            <Icon name="error_outline" size={16} />
            Run failed
          </div>
          <ExplainErrorPanel traceback={runError || 'Unknown error'} />
          <button
            onClick={() => runNow()}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-accent-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-400"
          >
            <Icon name="refresh" size={14} />
            Try again
          </button>
        </div>
      </div>
    );
  } else if (events.length === 0) {
    body = (
      <EmptyState
        message={runStatus === 'running' ? 'Running first iteration…' : 'Press Play or Re-run to start.'}
        showRun={runStatus !== 'running'}
      />
    );
  } else if (algorithm && dataset) {
    body = (
      <ErrorBoundary
        key={`${algorithm.family}:${dataset.id}`}
        compact
        title="Visualization error"
        description="This view hit an unexpected error while rendering. Try again or tweak the code."
      >
        <VizRouter
          family={algorithm.family}
          dataset={dataset}
          events={events}
          currentStep={currentStep}
        />
      </ErrorBoundary>
    );
  } else {
    body = null;
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Panel
        title="Visualization"
        subtitle={headerSubtitle}
        right={
          <div className="flex items-center gap-2">
            {events.length > 0 && (
              <ExportPngButton targetRef={vizContainerRef} fileName={headerSubtitle || 'visualization'} />
            )}
            <span className="font-mono text-[11px] text-ink-400">
              step {events.length === 0 ? 0 : currentStep + 1}/{events.length}
            </span>
          </div>
        }
        className="flex-1 min-h-0"
        bodyClassName="p-2 flex flex-col gap-2"
      >
        <div ref={vizContainerRef} className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-ink-700/50 bg-ink-900/50 p-2">
          {body}
          <ConvergenceCelebration />
        </div>
        {events.length > 0 && (
          <div className="shrink-0 px-1">
            <input
              type="range"
              min={0}
              max={Math.max(0, events.length - 1)}
              value={currentStep}
              onChange={(e) => seekTo(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink-700 accent-accent-400"
              aria-label="Timeline scrubber"
            />
            <div className="mt-1 flex justify-between text-[9px] font-mono text-ink-500">
              <span>step 1</span>
              <span>{event?.type ?? ''}</span>
              <span>step {events.length}</span>
            </div>
          </div>
        )}
      </Panel>

      <Panel
        title="What's happening now"
        subtitle={event ? `${event.type} · step ${event.step}` : '—'}
        className="shrink-0"
      >
        <ExplanationPanel event={event} />
      </Panel>
    </div>
  );
}

function ExplanationPanel({ event }: { event: ReturnType<typeof useCurrentEvent> }) {
  const quizMode = useSessionStore((s) => s.quizMode);
  const currentStep = useSessionStore((s) => s.currentStep);
  const [revealed, setRevealed] = useState(false);

  // Re-hide every time the step changes (in quiz mode you must reveal per-step).
  useEffect(() => {
    setRevealed(false);
  }, [currentStep]);

  const content = (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-ink-200">
        {event?.explanation ?? 'No events yet.'}
      </p>
      {event?.math && (
        <div className="overflow-x-auto rounded-md bg-ink-900 px-3 py-2">
          <BlockMath math={event.math} />
        </div>
      )}
      {familyOf(event?.type ?? 'finished') === 'system' && event?.type === 'error' && (
        <pre className="overflow-x-auto rounded-md bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {(event as { message?: string }).message}
        </pre>
      )}
    </div>
  );

  if (!quizMode || revealed) return content;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-md opacity-40">{content}</div>
      <div className="absolute inset-0 grid place-items-center">
        <button
          onClick={() => setRevealed(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-500/15 px-3 py-1.5 text-xs font-semibold text-accent-200 hover:bg-accent-500/25"
        >
          <Icon name="visibility" size={14} />
          Predict, then reveal
        </button>
      </div>
    </div>
  );
}
