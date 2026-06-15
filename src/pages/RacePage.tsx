/**
 * RacePage — head-to-head playback of 2–4 algorithms on the same dataset.
 *
 * Each "racer" is a (algorithm, code, hyperparams) bundle. Traces are
 * pre-computed sequentially in the worker, then the page plays them back
 * in lockstep using normalized race progress (0..1 of each racer's timeline).
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Select } from '@/components/ui/Select';
import { Slider } from '@/components/ui/Slider';
import { StatusPill } from '@/components/ui/StatusPill';
import { Panel } from '@/components/ui/Panel';
import { listAlgorithms, listAlgorithmsByCategory, getAlgorithm } from '@/algorithms/registry';
import { getAlgorithmSource } from '@/algorithms/algorithm-sources';
import { listDatasets, getDataset } from '@/datasets/registry';
import { CATEGORY_LABELS } from '@/types/algorithm';
import type { AlgorithmId } from '@/types/algorithm';
import { useRaceStore, progressToStep } from '@/stores/race-store';
import { runAllRacers, ensurePyodideForRace, attachRaceTicker } from '@/controllers/race-controller';
import { VizRouter } from '@/visualizations/VizRouter';
import { formatNumber } from '@/lib/utils';
import type { TraceEvent } from '@/types/trace';

const SLOT_COLORS = ['#60a5fa', '#f97316', '#10b981', '#a78bfa'];
const SLOT_IDS = ['A', 'B', 'C', 'D'];

export function RacePage() {
  const datasetId = useRaceStore((s) => s.datasetId);
  const racers = useRaceStore((s) => s.racers);
  const progress = useRaceStore((s) => s.progress);
  const playing = useRaceStore((s) => s.playing);
  const speed = useRaceStore((s) => s.speed);

  const setDataset = useRaceStore((s) => s.setDataset);
  const addRacer = useRaceStore((s) => s.addRacer);
  const removeRacer = useRaceStore((s) => s.removeRacer);
  const updateRacer = useRaceStore((s) => s.updateRacer);
  const setProgress = useRaceStore((s) => s.setProgress);
  const togglePlay = useRaceStore((s) => s.togglePlay);
  const reset = useRaceStore((s) => s.reset);
  const setSpeed = useRaceStore((s) => s.setSpeed);

  const [bootMsg, setBootMsg] = useState('Initializing…');
  const [booted, setBooted] = useState(false);
  const [running, setRunning] = useState(false);

  // Boot Pyodide + ticker once
  useEffect(() => {
    let cancelled = false;
    ensurePyodideForRace((m) => !cancelled && setBootMsg(m)).then(() => {
      if (!cancelled) setBooted(true);
    }).catch((err) => {
      if (!cancelled) setBootMsg(`Error: ${err.message}`);
    });
    const detach = attachRaceTicker();
    return () => {
      cancelled = true;
      detach();
    };
  }, []);

  // Seed the race with 2 racers + Iris dataset on first load
  useEffect(() => {
    if (racers.length === 0 && !datasetId) {
      setDataset('iris');
      const algos = listAlgorithms().filter((a) => a.compatibleTasks.includes('classification'));
      const a = algos.find((x) => x.id === 'logreg') ?? algos[0];
      const b = algos.find((x) => x.id === 'dtree') ?? algos[1] ?? algos[0];
      if (a && b) {
        addRacer('A', a.id, getAlgorithmSource(a.pythonFilename), hpDefaults(a));
        addRacer('B', b.id, getAlgorithmSource(b.pythonFilename), hpDefaults(b));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dataset = datasetId ? getDataset(datasetId) : null;
  const ds = dataset && datasetId ? listDatasets().find((d) => d.id === datasetId) : null;

  // Datasets are filtered by the *intersection* of racer-compatible tasks.
  const eligibleDatasets = useMemo(() => {
    const tasks = racers
      .map((r) => getAlgorithm(r.algorithmId)?.compatibleTasks ?? [])
      .reduce<Set<string> | null>((acc, t) => {
        if (acc === null) return new Set(t);
        const out = new Set<string>();
        for (const x of acc) if (t.includes(x as 'classification' | 'regression' | 'clustering')) out.add(x);
        return out;
      }, null);
    return listDatasets().filter((d) => !tasks || tasks.has(d.task));
  }, [racers]);

  // Algorithms eligible for the current dataset
  const algosForDataset = useMemo(() => {
    if (!ds) return listAlgorithms();
    return listAlgorithms().filter((a) => a.compatibleTasks.includes(ds.task as 'classification' | 'regression' | 'clustering'));
  }, [ds]);

  const algoGroups = useMemo(
    () =>
      listAlgorithmsByCategory()
        .map((g) => ({
          label: CATEGORY_LABELS[g.category],
          options: g.algorithms
            .filter((a) => algosForDataset.some((x) => x.id === a.id))
            .map((a) => ({ value: a.id, label: a.name })),
        }))
        .filter((g) => g.options.length > 0),
    [algosForDataset],
  );

  const handleAddRacer = () => {
    if (racers.length >= 4) return;
    const used = new Set(racers.map((r) => r.algorithmId));
    const next = algosForDataset.find((a) => !used.has(a.id)) ?? algosForDataset[0];
    if (!next) return;
    const id = SLOT_IDS[racers.length];
    addRacer(id, next.id, getAlgorithmSource(next.pythonFilename), hpDefaults(next));
  };

  const handleChangeRacerAlgo = (slot: string, newAlgoId: AlgorithmId) => {
    const meta = getAlgorithm(newAlgoId);
    if (!meta) return;
    updateRacer(slot, {
      algorithmId: newAlgoId,
      code: getAlgorithmSource(meta.pythonFilename),
      hyperparams: hpDefaults(meta),
    });
  };

  const handleRunRace = async () => {
    setRunning(true);
    try {
      await runAllRacers();
    } finally {
      setRunning(false);
    }
  };

  // Reset progress when racers change (so old playback state doesn't outlive them)
  const racerCount = racers.length;
  const racerSig = racers.map((r) => r.algorithmId).join(',');
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [racerCount, racerSig, datasetId]);

  const allDone = racers.length > 0 && racers.every((r) => r.status === 'done');

  // Grid layout adapts to viewport — keep racers single-column until xl so
  // each viz still has room on tablets and small laptops; allow 2-up at xl+.
  const gridCols = racers.length <= 1 ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2';

  return (
    <div className="flex h-full min-h-0 flex-col bg-ink-900 text-ink-200">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-ink-700 bg-ink-800/80 px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-ink-400 hover:text-ink-200"
          title="Home"
          aria-label="Back to home"
        >
          <Icon name="arrow_back" size={16} />
          <span className="hidden sm:inline">Home</span>
        </Link>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-ink-50">Race Mode</div>
          <div className="hidden text-[10px] uppercase tracking-wider text-ink-500 sm:block">Watch algorithms learn side-by-side</div>
        </div>

        {/* Selectors wrap onto a second row when narrow. */}
        <div className="order-last flex w-full items-center gap-2 sm:order-none sm:ml-3 sm:w-auto sm:border-l sm:border-ink-700 sm:pl-3">
          <label className="hidden text-[10px] font-medium uppercase tracking-wide text-ink-400 lg:inline">Data</label>
          <Select
            value={datasetId ?? ''}
            options={eligibleDatasets.map((d) => ({ value: d.id, label: `${d.name} (${d.samples}×${d.features}, ${d.task})` }))}
            onChange={(e) => setDataset(e.target.value)}
            aria-label="Dataset"
            className="min-w-0 flex-1 sm:min-w-[260px] sm:flex-none"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <StatusPill tone={booted ? 'ok' : 'loading'} pulse={!booted}>
            <span className="hidden md:inline">{booted ? 'Python ready' : bootMsg}</span>
            <span aria-label={booted ? 'Python ready' : bootMsg} className="md:hidden">
              <Icon name="terminal" size={14} />
            </span>
          </StatusPill>
          <Button onClick={handleRunRace} disabled={!booted || running || racers.length === 0} variant="primary" size="sm">
            {running ? (
              <>
                <Icon name="hourglass_top" size={14} />
                <span>Training</span>
              </>
            ) : (
              <>
                <Icon name="play_arrow" size={14} fill />
                <span className="sm:hidden">Train</span>
                <span className="hidden sm:inline">Train &amp; race</span>
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Race controls bar */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-ink-700 bg-ink-800/40 px-3 py-2 sm:gap-3 sm:px-4">
        <Button size="icon" variant="ghost" onClick={reset} disabled={!allDone} title="Reset" aria-label="Reset">
          <Icon name="replay" size={18} />
        </Button>
        <Button size="icon" variant="primary" onClick={togglePlay} disabled={!allDone} title={playing ? 'Pause' : 'Play'} aria-label={playing ? 'Pause' : 'Play'}>
          <Icon name={playing ? 'pause' : 'play_arrow'} size={20} fill />
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="hidden text-[10px] font-medium uppercase tracking-wide text-ink-400 sm:inline">Progress</span>
          <Slider value={progress} min={0} max={1} step={0.005} onValueChange={setProgress} disabled={!allDone} aria-label="Race progress" />
          <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-ink-300">{(progress * 100).toFixed(0)}%</span>
        </div>
        <div className="flex items-center gap-2 sm:border-l sm:border-ink-700 sm:pl-3">
          <span className="hidden text-[10px] font-medium uppercase tracking-wide text-ink-400 sm:inline">Speed</span>
          <Slider value={speed} min={0.25} max={4} step={0.25} onValueChange={setSpeed} className="w-20 sm:w-24" aria-label="Playback speed" />
          <span className="w-10 text-right font-mono text-[11px] tabular-nums text-ink-300">{speed.toFixed(2)}×</span>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-3 overflow-hidden p-2 sm:p-3">
        {/* Racers grid */}
        <div className={`col-span-12 grid min-h-0 min-w-0 xl:col-span-9 ${gridCols} gap-3 overflow-y-auto`}>
          {racers.map((r, idx) => {
            const meta = getAlgorithm(r.algorithmId);
            const stepIdx = progressToStep(progress, r.events.length);
            const color = SLOT_COLORS[idx];
            return (
              <Panel
                key={r.id}
                title={`${r.id} · ${meta?.name ?? r.algorithmId}`}
                subtitle={meta?.shortDescription}
                className="min-h-[320px]"
                right={
                  <div className="flex items-center gap-2">
                    <Select
                      value={r.algorithmId}
                      groups={algoGroups}
                      onChange={(e) => handleChangeRacerAlgo(r.id, e.target.value as AlgorithmId)}
                      aria-label={`Racer ${r.id} algorithm`}
                      className="min-w-0 max-w-[150px] sm:min-w-[160px] sm:max-w-none"
                    />
                    <button
                      onClick={() => removeRacer(r.id)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-ink-600 text-ink-400 hover:border-rose-400 hover:text-rose-200"
                      title="Remove racer"
                      aria-label={`Remove racer ${r.id}`}
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </div>
                }
                bodyClassName="flex flex-col gap-2"
              >
                <RacerHeader racer={r} color={color} stepIdx={stepIdx} />
                <div className="min-h-0 flex-1">
                  {dataset && meta && r.events.length > 0 ? (
                    <VizRouter family={meta.family} dataset={dataset} events={r.events} currentStep={stepIdx} />
                  ) : (
                    <div className="grid h-full place-items-center text-xs text-ink-500">
                      {r.status === 'running' ? 'Training…' : r.status === 'error' ? `Error: ${r.errorMessage}` : 'Press "Train & race" to start.'}
                    </div>
                  )}
                </div>
              </Panel>
            );
          })}

          {racers.length < 4 && (
            <button
              onClick={handleAddRacer}
              className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-700 bg-ink-800/30 p-6 text-sm text-ink-400 transition-colors hover:border-accent-500/50 hover:text-accent-300"
            >
              <Icon name="add" size={24} />
              <span>Add racer ({racers.length}/4)</span>
            </button>
          )}
        </div>

        {/* Comparison: stacks below racers until xl, then sits in the right rail. */}
        <div className="col-span-12 flex min-h-0 min-w-0 flex-col xl:col-span-3">
          <Panel title="Comparison" subtitle="Final-event metric over each racer's full timeline" bodyClassName="flex flex-col gap-3">
            <RaceComparison racers={racers} progress={progress} />
          </Panel>
        </div>
      </div>
    </div>
  );
}

function hpDefaults(meta: ReturnType<typeof getAlgorithm>): Record<string, number | string | boolean> {
  if (!meta) return {};
  const out: Record<string, number | string | boolean> = {};
  for (const p of meta.hyperparams) out[p.id] = p.default;
  return out;
}

function RacerHeader({ racer, color, stepIdx }: { racer: ReturnType<typeof useRaceStore.getState>['racers'][number]; color: string; stepIdx: number }) {
  const ev = racer.events[stepIdx];
  const metric = pickMetric(ev);

  return (
    <div className="flex items-center justify-between gap-2 border-b border-ink-700 pb-2">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        <StatusPill
          tone={racer.status === 'done' ? 'ok' : racer.status === 'running' || racer.status === 'queued' ? 'loading' : racer.status === 'error' ? 'error' : 'idle'}
          pulse={racer.status === 'running' || racer.status === 'queued'}
        >
          {racer.status === 'queued' ? 'queued' : racer.status === 'running' ? 'training…' : racer.status === 'done' ? `${racer.events.length} events` : racer.status}
        </StatusPill>
      </div>
      <div className="flex items-center gap-3 text-[11px]">
        <span className="text-ink-400">
          Step <span className="font-mono text-ink-200">{stepIdx + 1}/{Math.max(racer.events.length, 1)}</span>
        </span>
        {metric && (
          <span className="text-ink-400">
            {metric.label} <span className="font-mono text-ink-100">{metric.formatted}</span>
          </span>
        )}
      </div>
    </div>
  );
}

interface MetricPick {
  label: string;
  value: number;
  formatted: string;
  better: 'higher' | 'lower';
}

function pickMetric(event: TraceEvent | undefined): MetricPick | null {
  if (!event) return null;
  const e = event as unknown as Record<string, unknown>;
  if (typeof e.accuracy === 'number') return { label: 'acc', value: e.accuracy, formatted: `${(e.accuracy * 100).toFixed(1)}%`, better: 'higher' };
  if (typeof e.loss === 'number') return { label: 'loss', value: e.loss, formatted: formatNumber(e.loss, 4), better: 'lower' };
  if (typeof e.inertia === 'number') return { label: 'inertia', value: e.inertia, formatted: formatNumber(e.inertia, 2), better: 'lower' };
  if (typeof e.distortion === 'number') return { label: 'dist', value: e.distortion, formatted: formatNumber(e.distortion, 4), better: 'lower' };
  return null;
}

interface RaceComparisonProps {
  racers: ReturnType<typeof useRaceStore.getState>['racers'];
  progress: number;
}

function RaceComparison({ racers, progress }: RaceComparisonProps) {
  // Build a series per racer using the most-common metric across all racers.
  const series = useMemo(() => {
    const out: Array<{
      slot: string;
      algorithmId: string;
      points: Array<{ x: number; y: number }>;
      metricLabel: string;
      better: 'higher' | 'lower';
      currentY: number | null;
    }> = [];

    for (const r of racers) {
      if (r.events.length === 0) continue;
      const points: Array<{ x: number; y: number }> = [];
      let label = '';
      let better: 'higher' | 'lower' = 'lower';
      for (let i = 0; i < r.events.length; i += 1) {
        const m = pickMetric(r.events[i]);
        if (!m) continue;
        label = m.label;
        better = m.better;
        const x = r.events.length === 1 ? 0 : i / (r.events.length - 1);
        points.push({ x, y: m.value });
      }
      if (points.length === 0) continue;
      const currentStep = progressToStep(progress, r.events.length);
      const currentMetric = pickMetric(r.events[currentStep]);
      out.push({
        slot: r.id,
        algorithmId: r.algorithmId,
        points,
        metricLabel: label,
        better,
        currentY: currentMetric?.value ?? null,
      });
    }
    return out;
  }, [racers, progress]);

  if (series.length === 0) {
    return <div className="grid h-32 place-items-center text-xs text-ink-500">Run the race to see the comparison.</div>;
  }

  // Each series may use a different metric — that would make the chart misleading.
  // We split into groups by metricLabel and chart only the dominant group.
  const labels = new Map<string, number>();
  series.forEach((s) => labels.set(s.metricLabel, (labels.get(s.metricLabel) ?? 0) + 1));
  const dominantLabel = Array.from(labels.entries()).sort((a, b) => b[1] - a[1])[0][0];
  const shown = series.filter((s) => s.metricLabel === dominantLabel);
  const hiddenCount = series.length - shown.length;

  const width = 320;
  const height = 200;
  const pad = { top: 10, right: 8, bottom: 28, left: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const allY = shown.flatMap((s) => s.points.map((p) => p.y));
  const yMin = Math.min(...allY);
  const yMax = Math.max(...allY);
  const ySpan = yMax - yMin || Math.abs(yMin) || 1;
  const yLo = yMin - ySpan * 0.05;
  const yHi = yMax + ySpan * 0.05;

  const xScale = (v: number) => pad.left + v * innerW;
  const yScale = (v: number) => pad.top + innerH - ((v - yLo) / (yHi - yLo)) * innerH;

  const betterIsHigher = shown[0].better === 'higher';

  return (
    <>
      <div className="text-[10px] uppercase tracking-wide text-ink-400">
        {dominantLabel} ({betterIsHigher ? '↑ higher' : '↓ lower'} better)
        {hiddenCount > 0 && <span className="ml-1 text-rose-400">· {hiddenCount} racer(s) use different metrics & are hidden</span>}
      </div>
      <svg width={width} height={height} className="w-full" viewBox={`0 0 ${width} ${height}`}>
        {/* axes */}
        <line x1={pad.left} x2={pad.left + innerW} y1={pad.top + innerH} y2={pad.top + innerH} stroke="#374151" />
        <line x1={pad.left} x2={pad.left} y1={pad.top} y2={pad.top + innerH} stroke="#374151" />

        {/* y ticks */}
        {[0, 0.5, 1].map((t) => {
          const y = yLo + (yHi - yLo) * (1 - t);
          return (
            <g key={t}>
              <line x1={pad.left} x2={pad.left + innerW} y1={yScale(y)} y2={yScale(y)} stroke="#1f2937" />
              <text x={pad.left - 4} y={yScale(y) + 3} textAnchor="end" fontSize={9} fill="#94a3b8" fontFamily="monospace">
                {formatNumber(y, 2)}
              </text>
            </g>
          );
        })}

        {/* progress cursor */}
        <line x1={xScale(progress)} x2={xScale(progress)} y1={pad.top} y2={pad.top + innerH} stroke="#fbbf24" strokeWidth={1} strokeDasharray="3 2" opacity={0.7} />

        {/* series */}
        {shown.map((s, idx) => {
          const color = SLOT_COLORS[SLOT_IDS.indexOf(s.slot)] ?? SLOT_COLORS[idx];
          const path = s.points.map((p, k) => `${k === 0 ? 'M' : 'L'} ${xScale(p.x)} ${yScale(p.y)}`).join(' ');
          return (
            <g key={s.slot}>
              <path d={path} stroke={color} strokeWidth={1.5} fill="none" opacity={0.85} />
              {s.currentY !== null && (
                <circle cx={xScale(progress)} cy={yScale(s.currentY)} r={3.5} fill={color} stroke="#0f172a" strokeWidth={1.5} />
              )}
            </g>
          );
        })}

        <text x={pad.left} y={height - 6} fontSize={9} fill="#64748b">
          0% — race progress —
        </text>
        <text x={pad.left + innerW} y={height - 6} fontSize={9} fill="#64748b" textAnchor="end">
          100%
        </text>
      </svg>

      <div className="flex flex-col gap-1.5 text-[11px]">
        {shown.map((s) => {
          const color = SLOT_COLORS[SLOT_IDS.indexOf(s.slot)];
          const meta = getAlgorithm(s.algorithmId as AlgorithmId);
          return (
            <div key={s.slot} className="flex items-center justify-between gap-2 rounded border border-ink-700 bg-ink-950 px-2 py-1.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                <span className="text-ink-200">{s.slot} · {meta?.name ?? s.algorithmId}</span>
              </div>
              <span className="font-mono text-ink-100">
                {s.currentY !== null ? formatNumber(s.currentY, 4) : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
