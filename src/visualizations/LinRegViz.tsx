import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { TraceEvent } from '@/types/trace';
import type { Dataset } from '@/types/dataset';
import { LossChart } from './LossChart';

interface LinRegVizProps {
  dataset: Dataset;
  events: TraceEvent[];
  currentStep: number;
}

interface LinRegSnapshot {
  weights: number[] | null;
  history: Array<{ iteration: number; loss: number }>;
  currentIteration: number | null;
}

function snapshot(events: TraceEvent[], upTo: number): LinRegSnapshot {
  let weights: number[] | null = null;
  const history: Array<{ iteration: number; loss: number }> = [];
  let currentIteration: number | null = null;
  for (let i = 0; i <= upTo && i < events.length; i += 1) {
    const e = events[i];
    if (e.type === 'linreg:init') {
      weights = e.weights;
      history.push({ iteration: -1, loss: e.loss });
    } else if (e.type === 'linreg:step') {
      weights = e.weights;
      history.push({ iteration: e.iteration ?? history.length, loss: e.loss });
      currentIteration = e.iteration ?? null;
    } else if (e.type === 'linreg:converged') {
      currentIteration = e.iteration ?? currentIteration;
    }
  }
  return { weights, history, currentIteration };
}

function RegressionChart({ X, y, weights }: { X: number[][]; y: number[] | null; weights: number[] | null }) {
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

  const xs = useMemo(() => X.map((r) => r[0]), [X]);
  const ys = useMemo(() => y ?? [], [y]);

  const padding = { top: 14, right: 14, bottom: 36, left: 44 };
  const innerW = Math.max(1, size.w - padding.left - padding.right);
  const innerH = Math.max(1, size.h - padding.top - padding.bottom);

  const xScale = useMemo(() => {
    const [a, b] = d3.extent(xs) as [number, number];
    const lo = a ?? 0;
    const hi = b ?? 1;
    const pad = (hi - lo) * 0.08 || 0.5;
    return d3.scaleLinear().domain([lo - pad, hi + pad]).range([0, innerW]);
  }, [xs, innerW]);

  const yScale = useMemo(() => {
    const [a, b] = d3.extent(ys) as [number, number];
    const lo = a ?? 0;
    const hi = b ?? 1;
    const pad = (hi - lo) * 0.08 || 0.5;
    return d3.scaleLinear().domain([lo - pad, hi + pad]).range([innerH, 0]);
  }, [ys, innerH]);

  const linePts = useMemo(() => {
    if (!weights || weights.length < 2) return null;
    const b = weights[0];
    const m = weights[1];
    const [xMin, xMax] = xScale.domain();
    return [
      { x: xMin, y: b + m * xMin },
      { x: xMax, y: b + m * xMax },
    ];
  }, [weights, xScale]);

  return (
    <div ref={ref} className="h-full w-full">
      {size.w > 0 && size.h > 0 && (
        <svg width={size.w} height={size.h}>
          <g transform={`translate(${padding.left},${padding.top})`}>
            {xScale.ticks(5).map((t) => (
              <line key={`gx${t}`} x1={xScale(t)} x2={xScale(t)} y1={0} y2={innerH} stroke="#1e293b" strokeDasharray="2 4" />
            ))}
            {yScale.ticks(5).map((t) => (
              <line key={`gy${t}`} x1={0} x2={innerW} y1={yScale(t)} y2={yScale(t)} stroke="#1e293b" strokeDasharray="2 4" />
            ))}
            <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke="#334155" />
            <line x1={0} y1={0} x2={0} y2={innerH} stroke="#334155" />
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

            {X.map((row, i) => (
              <circle
                key={i}
                cx={xScale(row[0])}
                cy={yScale(ys[i])}
                r={3.2}
                fill="#60a5fa"
                fillOpacity={0.75}
                stroke="#0f172a"
                strokeWidth={0.5}
              />
            ))}

            {linePts && (
              <line
                x1={xScale(linePts[0].x)}
                y1={yScale(linePts[0].y)}
                x2={xScale(linePts[1].x)}
                y2={yScale(linePts[1].y)}
                stroke="#fbbf24"
                strokeWidth={2.5}
                style={{ transition: 'all 200ms ease' }}
              />
            )}
          </g>
        </svg>
      )}
    </div>
  );
}

export function LinRegViz({ dataset, events, currentStep }: LinRegVizProps) {
  const snap = useMemo(() => snapshot(events, currentStep), [events, currentStep]);
  return (
    <div className="grid h-full grid-rows-[3fr,1fr] gap-3">
      <div className="min-h-0 rounded-lg border border-ink-700/50 bg-ink-900/50 p-2">
        <RegressionChart X={dataset.X} y={dataset.y} weights={snap.weights} />
      </div>
      <div className="min-h-0 rounded-lg border border-ink-700/50 bg-ink-900/50 p-2">
        <LossChart
          history={snap.history.filter((h) => h.iteration >= 0)}
          currentIteration={snap.currentIteration}
          label="MSE / 2"
          yAxisLabel="Loss"
        />
      </div>
    </div>
  );
}
