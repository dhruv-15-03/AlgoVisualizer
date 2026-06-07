import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { TraceEvent } from '@/types/trace';
import type { Dataset } from '@/types/dataset';
import { LossChart } from './LossChart';
import { colorFor } from '@/lib/utils';

interface LogRegVizProps {
  dataset: Dataset;
  events: TraceEvent[];
  currentStep: number;
}

interface LogRegSnapshot {
  weights: number[] | null;
  history: Array<{ iteration: number; loss: number }>;
  accuracyHistory: Array<{ iteration: number; loss: number }>;
  currentIteration: number | null;
}

function snapshot(events: TraceEvent[], upTo: number): LogRegSnapshot {
  let weights: number[] | null = null;
  const history: Array<{ iteration: number; loss: number }> = [];
  const accuracyHistory: Array<{ iteration: number; loss: number }> = [];
  let currentIteration: number | null = null;
  for (let i = 0; i <= upTo && i < events.length; i += 1) {
    const e = events[i];
    if (e.type === 'logreg:init') {
      weights = e.weights;
      history.push({ iteration: -1, loss: e.loss });
      accuracyHistory.push({ iteration: -1, loss: e.accuracy });
    } else if (e.type === 'logreg:step') {
      weights = e.weights;
      history.push({ iteration: e.iteration ?? history.length, loss: e.loss });
      accuracyHistory.push({ iteration: e.iteration ?? accuracyHistory.length, loss: e.accuracy });
      currentIteration = e.iteration ?? null;
    } else if (e.type === 'logreg:converged') {
      currentIteration = e.iteration ?? currentIteration;
    }
  }
  return { weights, history, accuracyHistory, currentIteration };
}

function BoundaryChart({
  X,
  y,
  weights,
  featureNames,
}: {
  X: number[][];
  y: number[] | null;
  weights: number[] | null;
  featureNames?: string[];
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const padding = { top: 14, right: 14, bottom: 36, left: 44 };
  const innerW = Math.max(1, size.w - padding.left - padding.right);
  const innerH = Math.max(1, size.h - padding.top - padding.bottom);

  const xs = useMemo(() => X.map((r) => r[0]), [X]);
  const ys = useMemo(() => X.map((r) => r[1]), [X]);

  const xScale = useMemo(() => {
    const [a, b] = d3.extent(xs) as [number, number];
    const lo = a ?? 0;
    const hi = b ?? 1;
    const pad = (hi - lo) * 0.1 || 0.5;
    return d3.scaleLinear().domain([lo - pad, hi + pad]).range([0, innerW]);
  }, [xs, innerW]);

  const yScale = useMemo(() => {
    const [a, b] = d3.extent(ys) as [number, number];
    const lo = a ?? 0;
    const hi = b ?? 1;
    const pad = (hi - lo) * 0.1 || 0.5;
    return d3.scaleLinear().domain([lo - pad, hi + pad]).range([innerH, 0]);
  }, [ys, innerH]);

  // Decision boundary: b + w1*x + w2*y = 0  =>  y = -(b + w1*x) / w2
  const boundary = useMemo(() => {
    if (!weights || weights.length < 3 || Math.abs(weights[2]) < 1e-9) return null;
    const [b, w1, w2] = weights;
    const [xMin, xMax] = xScale.domain();
    return [
      { x: xMin, y: -(b + w1 * xMin) / w2 },
      { x: xMax, y: -(b + w1 * xMax) / w2 },
    ];
  }, [weights, xScale]);

  return (
    <div ref={ref} className="h-full w-full">
      {size.w > 0 && size.h > 0 && (
        <svg width={size.w} height={size.h}>
          <defs>
            <clipPath id="plot-clip">
              <rect x={0} y={0} width={innerW} height={innerH} />
            </clipPath>
          </defs>
          <g transform={`translate(${padding.left},${padding.top})`}>
            {xScale.ticks(5).map((t) => (
              <line key={`gx${t}`} x1={xScale(t)} x2={xScale(t)} y1={0} y2={innerH} stroke="#1e293b" strokeDasharray="2 4" />
            ))}
            {yScale.ticks(5).map((t) => (
              <line key={`gy${t}`} x1={0} x2={innerW} y1={yScale(t)} y2={yScale(t)} stroke="#1e293b" strokeDasharray="2 4" />
            ))}
            <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke="#334155" />
            <line x1={0} y1={0} x2={0} y2={innerH} stroke="#334155" />

            <g clipPath="url(#plot-clip)">
              {boundary && (
                <line
                  x1={xScale(boundary[0].x)}
                  y1={yScale(boundary[0].y)}
                  x2={xScale(boundary[1].x)}
                  y2={yScale(boundary[1].y)}
                  stroke="#fbbf24"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  style={{ transition: 'all 200ms ease' }}
                />
              )}
              {X.map((row, i) => (
                <circle
                  key={i}
                  cx={xScale(row[0])}
                  cy={yScale(row[1])}
                  r={3.2}
                  fill={colorFor(y?.[i] ?? 0)}
                  fillOpacity={0.8}
                  stroke="#0f172a"
                  strokeWidth={0.5}
                />
              ))}
            </g>

            {xScale.ticks(5).map((t) => (
              <text key={`tx${t}`} x={xScale(t)} y={innerH + 18} textAnchor="middle" fill="#64748b" fontSize={10} fontFamily="JetBrains Mono">
                {t}
              </text>
            ))}
            {yScale.ticks(5).map((t) => (
              <text key={`ty${t}`} x={-8} y={yScale(t) + 3} textAnchor="end" fill="#64748b" fontSize={10} fontFamily="JetBrains Mono">
                {t.toFixed(1)}
              </text>
            ))}
            {featureNames?.[0] && (
              <text x={innerW / 2} y={innerH + 32} textAnchor="middle" fill="#94a3b8" fontSize={11}>
                {featureNames[0]}
              </text>
            )}
            {featureNames?.[1] && (
              <text transform={`translate(-32,${innerH / 2}) rotate(-90)`} textAnchor="middle" fill="#94a3b8" fontSize={11}>
                {featureNames[1]}
              </text>
            )}
          </g>
        </svg>
      )}
    </div>
  );
}

export function LogRegViz({ dataset, events, currentStep }: LogRegVizProps) {
  const snap = useMemo(() => snapshot(events, currentStep), [events, currentStep]);
  return (
    <div className="grid h-full grid-rows-[3fr,1fr] gap-3">
      <div className="min-h-0 rounded-lg border border-ink-700/50 bg-ink-900/50 p-2">
        <BoundaryChart X={dataset.X} y={dataset.y} weights={snap.weights} featureNames={dataset.featureNames} />
      </div>
      <div className="min-h-0 rounded-lg border border-ink-700/50 bg-ink-900/50 p-2">
        <LossChart
          history={snap.history.filter((h) => h.iteration >= 0)}
          currentIteration={snap.currentIteration}
          label="Cross-entropy"
          yAxisLabel="Loss"
        />
      </div>
    </div>
  );
}
