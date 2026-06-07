import { useNavigate, useParams, Link } from 'react-router-dom';
import { useSessionStore } from '@/stores/session-store';
import { listAlgorithmsByCategory } from '@/algorithms/registry';
import { listDatasets } from '@/datasets/registry';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { StatusPill } from '@/components/ui/StatusPill';
import { Slider } from '@/components/ui/Slider';
import { runNow } from '@/controllers/training-controller';
import type { AlgorithmId } from '@/types/algorithm';
import { CATEGORY_LABELS } from '@/types/algorithm';

/**
 * TopNav — application header.
 *
 * Layout strategy:
 *   - At `xl+` (≥1280px): everything on one row — brand, selectors, status,
 *     quiz toggle, race link, full playback controls, speed slider.
 *   - At `<xl`: brand + status cluster on row 1, selectors wrap to row 2 with
 *     full width. Playback controls and speed slider are hidden — they live
 *     in the sticky `MobilePlaybackBar` at the bottom of the workspace.
 *   - At `<md`: action button labels collapse to icon-only to save horizontal space.
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
    <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-ink-700 bg-ink-800/80 px-3 py-2 backdrop-blur sm:gap-3 xl:flex-nowrap xl:px-4 xl:py-2.5">
      {/* Brand */}
      <Link to="/" className="flex items-center gap-2 text-ink-100 hover:text-ink-50" title="Home">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accent-500/15 text-accent-300">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 17l6-6 4 4 6-9" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="4" cy="17" r="1.5" fill="currentColor" />
            <circle cx="10" cy="11" r="1.5" fill="currentColor" />
            <circle cx="14" cy="15" r="1.5" fill="currentColor" />
            <circle cx="20" cy="6" r="1.5" fill="currentColor" />
          </svg>
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-tight text-ink-50">AlgoVisualizer</div>
          <div className="hidden text-[10px] uppercase tracking-wider text-ink-500 sm:block">Visual ML workspace</div>
        </div>
      </Link>

      {/* Right cluster: quiz / race / status — sits before selectors so it stays on row 1 when wrapped. */}
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
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

      {/* Selectors. `order-last w-full` on small screens forces them onto their own
          row so they get the full viewport width and stay tappable. */}
      <div className="order-last flex w-full items-center gap-2 sm:order-none sm:w-auto xl:ml-3 xl:border-l xl:border-ink-700 xl:pl-3">
        <label className="hidden text-[10px] uppercase tracking-wide text-ink-400 xl:inline">Algo</label>
        <Select
          value={algoId ?? ''}
          groups={algoGroups}
          onChange={(e) => navigate(`/workspace/${e.target.value}`)}
          aria-label="Algorithm"
          className="min-w-0 flex-1 sm:min-w-[200px] sm:flex-none"
        />
        <label className="hidden text-[10px] uppercase tracking-wide text-ink-400 xl:inline">Data</label>
        <Select
          value={datasetId ?? ''}
          options={datasets.map((d) => ({ value: d.id, label: `${d.name} (${d.samples}×${d.features})` }))}
          onChange={(e) => setDataset(e.target.value)}
          aria-label="Dataset"
          className="min-w-0 flex-1 sm:min-w-[200px] sm:flex-none"
        />
      </div>

      {/* Playback — desktop only. On smaller screens the MobilePlaybackBar shows these. */}
      <div className="hidden items-center gap-1 border-l border-ink-700 pl-3 xl:flex">
        <Button size="icon" variant="ghost" title="Step back" aria-label="Step back" onClick={stepBack} disabled={currentStep <= 0}>
          <Icon name="skip_previous" size={20} />
        </Button>
        <Button
          size="icon"
          variant="primary"
          title={playing ? 'Pause' : 'Play'}
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={togglePlay}
          disabled={events.length === 0}
        >
          <Icon name={playing ? 'pause' : 'play_arrow'} size={20} fill />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          title="Step forward"
          aria-label="Step forward"
          onClick={stepForward}
          disabled={currentStep >= events.length - 1}
        >
          <Icon name="skip_next" size={20} />
        </Button>
        <Button size="icon" variant="ghost" title="Reset" aria-label="Reset" onClick={resetPlayback} disabled={events.length === 0}>
          <Icon name="replay" size={18} />
        </Button>
        <Button size="sm" variant="secondary" onClick={() => runNow()}>
          <Icon name="restart_alt" size={14} />
          <span>Re-run</span>
        </Button>
      </div>

      {/* Speed slider — desktop only. */}
      <div className="hidden items-center gap-2 border-l border-ink-700 pl-3 xl:flex">
        <span className="text-[10px] font-medium uppercase tracking-wide text-ink-400">Speed</span>
        <Slider value={speed} min={0.5} max={8} step={0.25} onValueChange={setSpeed} className="w-24" />
        <span className="w-10 text-right font-mono text-[11px] tabular-nums text-ink-300">{speed.toFixed(2)}×</span>
      </div>
    </header>
  );
}
