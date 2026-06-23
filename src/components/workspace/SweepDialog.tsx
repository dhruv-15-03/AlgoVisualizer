/**
 * SweepDialog — modal for running a hyperparameter sweep.
 *
 * The user picks a min/max/steps range. Pressing "Run" sequentially trains
 * the algorithm at each point and plots the final metric. Each point can
 * be clicked to apply that value back to the workspace.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { getAlgorithm } from '@/algorithms/registry';
import { runSweep } from '@/controllers/sweep-controller';
import { patchCode } from '@/lib/code-binding';
import type { SweepPoint } from '@/types/sweep';
import { formatNumber } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';
import { ModalPortal } from '@/components/ui/ModalPortal';

interface SweepDialogProps {
  hyperparamId: string;
  onClose: () => void;
}

export function SweepDialog({ hyperparamId, onClose }: SweepDialogProps) {
  const algorithmId = useSessionStore((s) => s.algorithmId);
  const datasetId = useSessionStore((s) => s.datasetId);
  const baseCode = useSessionStore((s) => s.code);
  const baseHyperparams = useSessionStore((s) => s.hyperparams);
  const setHyperparam = useSessionStore((s) => s.setHyperparam);
  const setCode = useSessionStore((s) => s.setCode);

  const algorithm = algorithmId ? getAlgorithm(algorithmId) : null;
  const hpMeta = algorithm?.hyperparams.find((h) => h.id === hyperparamId) ?? null;

  // Default range = hyperparam slider range, with a reasonable number of steps.
  const defaultMin = hpMeta?.min ?? 0;
  const defaultMax = hpMeta?.max ?? 1;
  const [min, setMin] = useState(defaultMin);
  const [max, setMax] = useState(defaultMax);
  const [steps, setSteps] = useState(hpMeta?.type === 'int' ? Math.min(10, Math.max(2, defaultMax - defaultMin + 1)) : 8);

  const [points, setPoints] = useState<SweepPoint[]>([]);
  const [running, setRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const cancelRef = useRef(false);

  const values = useMemo(() => {
    if (steps < 2) return [min];
    const out: number[] = [];
    const span = max - min;
    for (let i = 0; i < steps; i += 1) {
      const v = min + (span * i) / (steps - 1);
      out.push(hpMeta?.type === 'int' ? Math.round(v) : v);
    }
    // dedupe (mainly for int sweeps with steps > range)
    return Array.from(new Set(out));
  }, [min, max, steps, hpMeta]);

  useEffect(() => {
    // Reset preview points when range changes
    if (!running) setPoints(values.map((v) => ({ value: v, metric: null, metricKind: null, totalEvents: 0, status: 'pending' })));
  }, [values, running]);

  // Esc-to-close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !running) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, running]);

  if (!algorithm || !hpMeta || !datasetId) return null;

  const handleRun = async () => {
    setRunning(true);
    cancelRef.current = false;
    setCurrentIndex(-1);
    try {
      await runSweep({
        algorithm,
        datasetId,
        baseCode,
        baseHyperparams,
        hyperparamId,
        values,
        onProgress: (pts, idx) => {
          setPoints([...pts]);
          setCurrentIndex(idx);
        },
        shouldCancel: () => cancelRef.current,
      });
    } finally {
      setRunning(false);
      setCurrentIndex(-1);
    }
  };

  const handleCancel = () => {
    cancelRef.current = true;
  };

  const handleApply = (value: number) => {
    const coerced = hpMeta.type === 'int' ? Math.round(value) : value;
    setHyperparam(hyperparamId, coerced);
    setCode(patchCode(baseCode, hpMeta.codeKey, coerced));
    onClose();
  };

  const completed = points.filter((p) => p.status === 'done').length;
  const metricKind = points.find((p) => p.metricKind)?.metricKind ?? null;
  const betterIsHigher = metricKind === 'accuracy';

  let bestIndex: number | null = null;
  let bestMetric: number | null = null;
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    if (p.status !== 'done' || p.metric === null) continue;
    if (bestMetric === null || (betterIsHigher ? p.metric > bestMetric : p.metric < bestMetric)) {
      bestMetric = p.metric;
      bestIndex = i;
    }
  }

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        className="flex h-full max-h-[100dvh] w-full flex-col overflow-hidden border border-ink-600 bg-ink-900 shadow-2xl sm:max-h-[90vh] sm:max-w-3xl sm:rounded-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sweep-dialog-title"
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-ink-700 px-3 py-3 sm:px-4">
          <div className="min-w-0">
            <h2 id="sweep-dialog-title" className="truncate text-sm font-semibold text-ink-100">
              Sweep <span className="text-accent-300">{hpMeta.label}</span>
            </h2>
            <p className="mt-0.5 text-[11px] text-ink-400">
              Trains {algorithm.name} multiple times across a range and plots how the final metric responds.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={running}
            aria-label="Close sweep dialog"
            title="Close"
            className="touch-target inline-flex shrink-0 items-center justify-center rounded-md border border-ink-600 px-2 py-1 text-xs text-ink-300 hover:border-ink-500 disabled:opacity-40"
          >
            <Icon name="close" size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <RangeInput label="Min" value={min} onChange={setMin} disabled={running} step={hpMeta.type === 'int' ? 1 : (hpMeta.step ?? 0.01)} />
            <RangeInput label="Max" value={max} onChange={setMax} disabled={running} step={hpMeta.type === 'int' ? 1 : (hpMeta.step ?? 0.01)} />
            <RangeInput label="Steps" value={steps} onChange={(v) => setSteps(Math.max(2, Math.min(20, Math.round(v))))} disabled={running} step={1} />
            <div className="flex items-end">
              {running ? (
                <button onClick={handleCancel} className="w-full rounded-md border border-rose-500 bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/25">
                  Cancel
                </button>
              ) : (
                <button onClick={handleRun} className="w-full rounded-md border border-accent-400 bg-accent-500/20 px-3 py-2 text-xs font-semibold text-accent-100 hover:bg-accent-500/30">
                  Run sweep ({values.length})
                </button>
              )}
            </div>
          </div>

          {running && (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink-800">
              <div
                className="h-full bg-accent-400 transition-all duration-300"
                style={{ width: `${(completed / Math.max(values.length, 1)) * 100}%` }}
              />
            </div>
          )}

          <div className="mt-4 rounded-md border border-ink-700 bg-ink-950 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-400">
              <span className="inline-flex flex-wrap items-center gap-1.5">
                <span>{points.length} points · {completed} done</span>
                {metricKind && (
                  <span className="inline-flex items-center gap-1">
                    · tracking <span className="font-mono text-ink-200">{metricKind}</span>
                    <span className="inline-flex items-center gap-0.5 text-ink-400">
                      (<Icon name={betterIsHigher ? 'trending_up' : 'trending_down'} size={12} />
                      {betterIsHigher ? 'higher better' : 'lower better'})
                    </span>
                  </span>
                )}
              </span>
              {bestIndex !== null && bestMetric !== null && (
                <span className="inline-flex items-center gap-1">
                  Best:
                  <span className="font-mono text-emerald-300">{formatNumber(points[bestIndex].value, 3)}</span>
                  <Icon name="arrow_right_alt" size={14} className="text-emerald-400" />
                  <span className="font-mono text-emerald-300">{formatNumber(bestMetric, 4)}</span>
                </span>
              )}
            </div>
            <SweepChart points={points} bestIndex={bestIndex} betterIsHigher={betterIsHigher} currentIndex={currentIndex} onApply={handleApply} />
          </div>
        </div>

        {/* Sticky footer holds the apply action on mobile so it's always reachable. */}
        {bestIndex !== null && !running && (
          <div className="safe-bottom shrink-0 border-t border-ink-700 bg-ink-900/95 px-3 py-2 sm:px-4">
            <button
              onClick={() => handleApply(points[bestIndex!].value)}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-emerald-400 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25 sm:w-auto"
            >
              <Icon name="check_circle" size={14} fill />
              <span>Apply best</span>
              <Icon name="arrow_right_alt" size={14} />
              <span className="font-mono">{formatNumber(points[bestIndex].value, 3)}</span>
            </button>
          </div>
        )}
      </div>
    </div>
    </ModalPortal>
  );
}

function RangeInput({
  label,
  value,
  onChange,
  disabled,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">{label}</span>
      <input
        type="number"
        value={value}
        step={step ?? 1}
        disabled={disabled}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(n);
        }}
        className="rounded-md border border-ink-600 bg-ink-800 px-2 py-1.5 font-mono text-sm text-ink-100 focus:border-accent-400 focus:outline-none disabled:opacity-50"
      />
    </label>
  );
}

interface SweepChartProps {
  points: SweepPoint[];
  bestIndex: number | null;
  betterIsHigher: boolean;
  currentIndex: number;
  onApply: (value: number) => void;
}

function SweepChart({ points, bestIndex, betterIsHigher, currentIndex, onApply }: SweepChartProps) {
  const width = 640;
  const height = 220;
  const pad = { top: 12, right: 12, bottom: 32, left: 48 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const done = points.filter((p) => p.status === 'done' && p.metric !== null);
  if (done.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-xs text-ink-400">
        {points.length === 0 ? 'Configure a range and run.' : 'Waiting for results…'}
      </div>
    );
  }

  const xs = points.map((p) => p.value);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const xSpan = xMax - xMin || 1;

  const ys = done.map((p) => p.metric as number);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const ySpan = yMax - yMin || Math.abs(yMin) || 1;
  // pad y a touch
  const yLo = yMin - ySpan * 0.1;
  const yHi = yMax + ySpan * 0.1;
  const yRange = yHi - yLo;

  const xScale = (v: number) => pad.left + ((v - xMin) / xSpan) * innerW;
  const yScale = (v: number) => pad.top + innerH - ((v - yLo) / yRange) * innerH;

  // Polyline through done points in original order
  const sortedDone = points
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.status === 'done' && p.metric !== null)
    .sort((a, b) => a.p.value - b.p.value);
  const path = sortedDone.map(({ p }, k) => `${k === 0 ? 'M' : 'L'} ${xScale(p.value)} ${yScale(p.metric as number)}`).join(' ');

  // y-axis tick lines (4 ticks)
  const yTicks = 4;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => yLo + (yRange * i) / yTicks);

  return (
    <svg width={width} height={height} className="w-full" viewBox={`0 0 ${width} ${height}`}>
      {/* y-grid */}
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={pad.left} x2={pad.left + innerW} y1={yScale(t)} y2={yScale(t)} stroke="#1f2937" strokeWidth={1} />
          <text x={pad.left - 6} y={yScale(t) + 3} textAnchor="end" fontSize={10} fill="#94a3b8" fontFamily="monospace">
            {formatNumber(t, 3)}
          </text>
        </g>
      ))}
      {/* x-axis */}
      <line x1={pad.left} x2={pad.left + innerW} y1={pad.top + innerH} y2={pad.top + innerH} stroke="#374151" strokeWidth={1} />
      {points.map((p, i) => (
        <text
          key={`xt-${i}`}
          x={xScale(p.value)}
          y={pad.top + innerH + 14}
          textAnchor="middle"
          fontSize={9}
          fill="#94a3b8"
          fontFamily="monospace"
        >
          {formatNumber(p.value, 2)}
        </text>
      ))}

      <path d={path} stroke="#60a5fa" strokeWidth={2} fill="none" />

      {points.map((p, i) => {
        const isBest = i === bestIndex;
        const isCurrent = i === currentIndex;
        let fill = '#374151';
        let stroke = '#6b7280';
        if (p.status === 'done' && p.metric !== null) {
          fill = isBest ? '#10b981' : '#60a5fa';
          stroke = isBest ? '#34d399' : '#93c5fd';
        }
        if (p.status === 'error') {
          fill = '#7f1d1d';
          stroke = '#ef4444';
        }
        if (isCurrent) {
          stroke = '#fbbf24';
        }
        const cx = xScale(p.value);
        const cy = p.status === 'done' && p.metric !== null ? yScale(p.metric) : pad.top + innerH;
        return (
          <g key={i}>
            {isCurrent && (
              <circle cx={cx} cy={cy} r={9} fill="none" stroke="#fbbf24" strokeWidth={1.5}>
                <animate attributeName="r" values="6;12;6" dur="1.2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="1;0.2;1" dur="1.2s" repeatCount="indefinite" />
              </circle>
            )}
            <circle
              cx={cx}
              cy={cy}
              r={isBest ? 6 : 4}
              fill={fill}
              stroke={stroke}
              strokeWidth={isBest ? 2 : 1}
              style={{ cursor: p.status === 'done' ? 'pointer' : 'default' }}
              onClick={() => {
                if (p.status === 'done') onApply(p.value);
              }}
            >
              <title>
                {p.status === 'done' && p.metric !== null
                  ? `${formatNumber(p.value, 3)} → ${formatNumber(p.metric, 4)}${isBest ? ' (best)' : ''}`
                  : p.status === 'error'
                  ? `${formatNumber(p.value, 3)} → error: ${p.errorMessage}`
                  : p.status === 'running'
                  ? `${formatNumber(p.value, 3)} → running…`
                  : `${formatNumber(p.value, 3)} → pending`}
              </title>
            </circle>
          </g>
        );
      })}

      {/* axis label */}
      <text x={pad.left + innerW / 2} y={height - 4} textAnchor="middle" fontSize={10} fill="#64748b">
        {betterIsHigher ? '▲ higher better' : '▼ lower better'}
      </text>
    </svg>
  );
}
