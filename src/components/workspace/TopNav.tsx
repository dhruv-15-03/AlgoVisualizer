import { useNavigate, useParams, Link } from 'react-router-dom';
import { useSessionStore } from '@/stores/session-store';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { listAlgorithmsByCategory } from '@/algorithms/registry';
import { listDatasets } from '@/datasets/registry';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { StatusPill } from '@/components/ui/StatusPill';
import { Slider } from '@/components/ui/Slider';
import { ShareButton } from '@/components/workspace/ShareButton';
import { ByoDataButton } from '@/components/workspace/ByoDataButton';
import { runNow } from '@/controllers/training-controller';
import type { AlgorithmId } from '@/types/algorithm';
import { CATEGORY_LABELS } from '@/types/algorithm';

/**
 * TopNav — application header.
 *
 * Layout strategy — two stable, independently-wrapping zones so nothing ever
 * overflows horizontally at any viewport width:
 *
 *   Zone 1 (context): brand · secondary actions (share/quiz/race) · status
 *     pills · algorithm + dataset selectors. Wraps freely; selectors drop to
 *     their own full-width row on the narrowest screens.
 *   Zone 2 (transport): step-back · play/pause · step-forward · reset · re-run,
 *     with the speed control pinned to the right. ALWAYS visible at every width
 *     — this is the single source of transport, so there is no "dead zone"
 *     where the controls are unreachable and no dependency on a separate mobile
 *     bar. The speed group wraps below the buttons only on very narrow screens;
 *     it never forces the header wider than the viewport.
 *
 * Keyboard transport (Space/←/→/Home/End/R) is wired separately in
 * `usePlaybackKeyboard` and documented via each control's `aria-keyshortcuts`.
 */
export function TopNav() {
  const navigate = useNavigate();
  const { algoId } = useParams<{ algoId?: AlgorithmId }>();

  const pyodideStatus = useSessionStore((s) => s.pyodideStatus);
  const pyodideProgress = useSessionStore((s) => s.pyodideProgress);
  const runStatus = useSessionStore((s) => s.runStatus);
  const datasetId = useSessionStore((s) => s.datasetId);
  const setDataset = useSessionStore((s) => s.setDataset);
  const playing = useSessionStore((s) => s.playing);
  const togglePlay = useSessionStore((s) => s.togglePlay);
  const stepForward = useSessionStore((s) => s.stepForward);
  const stepBack = useSessionStore((s) => s.stepBack);
  const resetPlayback = useSessionStore((s) => s.resetPlayback);
  const speed = useSessionStore((s) => s.speed);
  const setSpeed = useSessionStore((s) => s.setSpeed);
  const events = useSessionStore((s) => s.events);
  const currentStep = useSessionStore((s) => s.currentStep);
  const quizMode = useSessionStore((s) => s.quizMode);
  const toggleQuizMode = useSessionStore((s) => s.toggleQuizMode);
  const reduceMotion = usePrefersReducedMotion();

  const algoGroups = listAlgorithmsByCategory()
    .filter((g) => g.algorithms.length > 0)
    .map((g) => ({
      label: CATEGORY_LABELS[g.category],
      options: g.algorithms.map((a) => ({ value: a.id, label: a.name })),
    }));
  const datasets = listDatasets();

  const pyTone =
    pyodideStatus === 'ready'
      ? 'ok'
      : pyodideStatus === 'error'
        ? 'error'
        : pyodideStatus === 'loading'
          ? 'loading'
          : 'idle';
  const pyLabel =
    pyodideStatus === 'ready'
      ? 'Python ready'
      : pyodideStatus === 'loading'
        ? pyodideProgress || 'Loading…'
        : pyodideStatus === 'error'
          ? `Error: ${pyodideProgress}`
          : 'Python idle';

  const runTone =
    runStatus === 'running'
      ? 'loading'
      : runStatus === 'success'
        ? 'ok'
        : runStatus === 'error'
          ? 'error'
          : runStatus === 'cancelled'
            ? 'warn'
            : 'idle';

  const runShortLabel =
    runStatus === 'running'
      ? `${events.length}`
      : runStatus === 'success'
        ? `${events.length}`
        : runStatus === 'error'
          ? 'err'
          : runStatus === 'cancelled'
            ? '×'
            : '—';

  const runLongLabel =
    runStatus === 'running'
      ? `Running… ${events.length} events`
      : runStatus === 'success'
        ? `Done · ${events.length} events`
        : runStatus === 'error'
          ? 'Error'
          : runStatus === 'cancelled'
            ? 'Cancelled'
            : 'Idle';

  return (
    <header className="flex shrink-0 flex-col gap-2 border-b border-ink-700 bg-ink-800/80 px-3 py-2 backdrop-blur sm:gap-2.5 xl:px-4 xl:py-2.5">
      {/* ── Zone 1: context (brand · actions · status · selectors) ─────────────
          Wraps freely; nothing here is overflow-critical. */}
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
        {/* Brand — allowed to shrink/truncate so it never forces overflow at
            narrow widths; the logo stays fixed. The brand mark is tinted by the
            active algorithm family and gently animated (orbit dot + glow), all
            gated by reduced-motion. */}
        <Link to="/" className="group flex min-w-0 shrink items-center gap-2.5 text-ink-100 hover:text-ink-50" title="Home">
          <div className="relative grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-family-accent/15 text-family-text shadow-sm ring-1 ring-family-accent/30">
            {!reduceMotion && (
              <>
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-lg bg-family-accent/25 blur-md animate-brand-glow"
                />
                <span aria-hidden className="pointer-events-none absolute inset-[-3px] animate-brand-orbit">
                  <span className="absolute left-1/2 top-0 h-1 w-1 -translate-x-1/2 rounded-full bg-family-text shadow-[0_0_6px_rgb(var(--family-accent-rgb)/0.7)]" />
                </span>
              </>
            )}
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="relative"
            >
              <path d="M4 17l6-6 4 4 6-9" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="4" cy="17" r="1.5" fill="currentColor" />
              <circle cx="10" cy="11" r="1.5" fill="currentColor" />
              <circle cx="14" cy="15" r="1.5" fill="currentColor" />
              <circle cx="20" cy="6" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="truncate font-display text-sm font-semibold tracking-tight text-ink-50">AlgoVisualizer</div>
            <div className="hidden text-[10px] uppercase tracking-wider text-ink-500 sm:block">Visual ML workspace</div>
          </div>
        </Link>

        {/* Right cluster: share / quiz / race / status — pushed right by ml-auto. */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ShareButton />
          <button
            onClick={toggleQuizMode}
            title={`Quiz mode ${quizMode ? 'on' : 'off'} — hide explanations until you reveal them`}
            aria-pressed={quizMode}
            aria-label="Toggle quiz mode"
            className={`touch-target inline-flex items-center justify-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
              quizMode
                ? 'border-accent-400 bg-accent-500/15 text-accent-200'
                : 'border-ink-600 text-ink-300 hover:border-ink-500 hover:text-ink-100'
            }`}
          >
            <Icon name="quiz" size={16} fill={quizMode} />
            <span className="hidden md:inline">Quiz {quizMode ? 'on' : 'off'}</span>
          </button>
          <Link
            to="/race"
            title="Race mode — compare algorithms side by side"
            aria-label="Race mode"
            className="touch-target inline-flex items-center justify-center gap-1.5 rounded-md border border-ink-600 px-2 py-1 text-xs font-medium text-ink-300 hover:border-accent-400 hover:text-accent-200"
          >
            <Icon name="flag" size={16} />
            <span className="hidden md:inline">Race</span>
          </Link>
          <StatusPill tone={pyTone} pulse={pyodideStatus === 'loading'}>
            <span className="hidden md:inline">{pyLabel}</span>
            <span aria-label={pyLabel} className="md:hidden">
              <Icon name="terminal" size={14} />
            </span>
          </StatusPill>
          <StatusPill tone={runTone} pulse={runStatus === 'running'}>
            <span className="hidden md:inline">{runLongLabel}</span>
            <span aria-label={runLongLabel} className="md:hidden">
              {runShortLabel}
            </span>
          </StatusPill>
        </div>

        {/* Selectors. `order-last w-full` on small screens forces them onto their
            own row so they get the full viewport width and stay tappable. */}
        <div className="order-last flex w-full min-w-0 items-center gap-2 sm:order-none sm:w-auto">
          <label className="hidden shrink-0 text-[10px] uppercase tracking-wide text-ink-400 xl:inline">Algo</label>
          <Select
            value={algoId ?? ''}
            groups={algoGroups}
            onChange={(e) => navigate(`/workspace/${e.target.value}`)}
            aria-label="Algorithm"
            className="min-w-0 flex-1 border-l-2 border-l-family-accent/70 font-medium text-family-text focus:ring-family-accent sm:w-[200px] sm:flex-none"
          />
          <label className="hidden shrink-0 text-[10px] uppercase tracking-wide text-ink-400 xl:inline">Data</label>
          <Select
            value={datasetId ?? ''}
            options={datasets.map((d) => ({ value: d.id, label: `${d.name} (${d.samples}×${d.features})` }))}
            onChange={(e) => setDataset(e.target.value)}
            aria-label="Dataset"
            className="min-w-0 flex-1 sm:w-[200px] sm:flex-none"
          />
          <ByoDataButton />
        </div>
      </div>

      {/* ── Zone 2: transport — ALWAYS visible at every width ──────────────────
          A single source of playback transport (no separate mobile bar, no dead
          zone). The button group and the speed group each `shrink` and the
          speed slider has `min-w-0`, so the row compresses to fit instead of
          overflowing. `aria-keyshortcuts` documents the keyboard transport. */}
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 border-t border-ink-700/60 pt-2">
        <div className="flex shrink-0 items-center gap-1" aria-label="Playback controls">
          <Button
            size="icon"
            variant="ghost"
            title="Step back (Left arrow)"
            aria-label="Step back"
            aria-keyshortcuts="ArrowLeft Home"
            className="touch-target"
            onClick={stepBack}
            disabled={currentStep <= 0}
          >
            <Icon name="skip_previous" size={20} />
          </Button>
          <Button
            size="icon"
            variant="primary"
            title={`${playing ? 'Pause' : 'Play'} (Space)`}
            aria-label={playing ? 'Pause' : 'Play'}
            aria-keyshortcuts="Space"
            className="touch-target"
            onClick={togglePlay}
            disabled={events.length === 0}
          >
            <Icon name={playing ? 'pause' : 'play_arrow'} size={20} fill />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title="Step forward (Right arrow)"
            aria-label="Step forward"
            aria-keyshortcuts="ArrowRight End"
            className="touch-target"
            onClick={stepForward}
            disabled={currentStep >= events.length - 1}
          >
            <Icon name="skip_next" size={20} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title="Reset (R)"
            aria-label="Reset"
            aria-keyshortcuts="R"
            className="touch-target"
            onClick={resetPlayback}
            disabled={events.length === 0}
          >
            <Icon name="replay" size={18} />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="whitespace-nowrap"
            onClick={() => runNow()}
            disabled={runStatus === 'running'}
          >
            <Icon name="restart_alt" size={14} />
            <span>Re-run</span>
          </Button>
        </div>

        {/* Speed group — its own full-width line on mobile (so its label/value
            never get crushed), flexes inline from `sm` up. Slider has `min-w-0`
            so it shrinks instead of forcing overflow. */}
        <div className="flex w-full min-w-0 items-center gap-2 sm:ml-auto sm:w-auto sm:max-w-[280px] sm:flex-1">
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-ink-400">Speed</span>
          <Slider
            value={speed}
            min={0.5}
            max={8}
            step={0.25}
            aria-label="Playback speed"
            onValueChange={setSpeed}
            className="min-w-0 flex-1"
          />
          <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-ink-300">
            {speed.toFixed(2)}×
          </span>
        </div>
      </div>
    </header>
  );
}
