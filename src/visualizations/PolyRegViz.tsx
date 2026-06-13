/**
 * Polynomial Regression visualization.
 *
 * Renders the scatter + the current polynomial fit (drawn as a smooth path)
 * + a loss-curve below. Weights are interpreted as polynomial coefficients
 * [a_0, a_1, ..., a_d] for y = a_0 + a_1 x + a_2 x^2 + ... a_d x^d.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { TraceEvent } from '@/types/trace';
import type { Dataset } from '@/types/dataset';
import { LossChart } from './LossChart';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
interface PolyRegVizProps {
  dataset: Dataset;
  events: TraceEvent[];
  currentStep: number;
}

interface PolyRegSnapshot {
  weights: number[] | null;
  degree: number;
  history: Array<{ iteration: number; loss: number }>;
  currentIteration: number | null;
}

function snapshot(events: TraceEvent[], upTo: number): PolyRegSnapshot {
  let weights: number[] | null = null;
  let degree = 1;
  const history: Array<{ iteration: number; loss: number }> = [];
  let currentIteration: number | null = null;
  for (let i = 0; i <= upTo && i < events.length; i += 1) {
    const e = events[i];
    if (e.type === 'polyreg:init') {
      weights = e.weights;
      degree = e.degree;
      history.push({ iteration: -1, loss: e.loss });
    } else if (e.type === 'polyreg:step') {
      weights = e.weights;
      degree = e.degree;
      const iter = e.iteration ?? history.length;
      history.push({ iteration: iter, loss: e.loss });
      currentIteration = iter;
    } else if (e.type === 'polyreg:converged') {
      weights = e.weights;
      degree = e.degree;
      history.push({ iteration: (currentIteration ?? 0) + 1, loss: e.finalLoss });
    }
  }
  return { weights, degree, history, currentIteration };
}

function PolyChart({ X, y, weights }: { X: number[][]; y: number[] | null; weights: number[] | null }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const reduceMotion = usePrefersReducedMotion();
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
  const ys = useMemo(() => y ?? [], [y]);

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

  // Sample the polynomial curve along x.
  const pathD = useMemo(() => {
    if (!weights || weights.length === 0) return null;
    const [xMin, xMax] = xScale.domain();
    const N = 80;
    let d = '';
    for (let i = 0; i <= N; i += 1) {
      const x = xMin + (i / N) * (xMax - xMin);
      let yVal = 0;
      let xp = 1;
      for (let k = 0; k < weights.length; k += 1) {
        yVal += weights[k] * xp;
        xp *= x;
      }
      const px = xScale(x);
      const py = yScale(yVal);
      d += i === 0 ? `M ${px} ${py}` : ` L ${px} ${py}`;
    }
    return d;
  }, [weights, xScale, yScale]);

  return (
    <div ref={ref} className="h-full w-full">
      {size.w > 0 && size.h > 0 && (
        <svg width={size.w} height={size.h}>
          <defs>
            <clipPath id="poly-clip">
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

            <g clipPath="url(#poly-clip)">
              {X.map((row, i) => (
                <circle key={i} cx={xScale(row[0])} cy={yScale(ys[i])} r={3.2} fill="#60a5fa" fillOpacity={0.75} stroke="#0f172a" strokeWidth={0.5} />
              ))}
              {pathD && (
                <path d={pathD} fill="none" stroke="#fbbf24" strokeWidth={2.5} style={{ transition: reduceMotion ? undefined : 'd 200ms ease' }} />
              )}
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
          </g>
        </svg>
      )}
    </div>
  );
}

export function PolyRegViz({ dataset, events, currentStep }: PolyRegVizProps) {
  const snap = useMemo(() => snapshot(events, currentStep), [events, currentStep]);
  return (
    <div className="grid h-full grid-rows-[3fr,1fr] gap-3">
      <div className="relative min-h-0 rounded-lg border border-ink-700/50 bg-ink-900/50 p-2">
        <PolyChart X={dataset.X} y={dataset.y} weights={snap.weights} />
        <div className="absolute right-3 top-2 rounded-md bg-ink-800/90 px-2 py-1 text-[10px] font-mono text-ink-200">
          degree <span className="text-accent-300">{snap.degree}</span>
        </div>
      </div>
      <div className="min-h-0 rounded-lg border border-ink-700/50 bg-ink-900/50 p-2">
        <LossChart history={snap.history.filter((h) => h.iteration >= 0)} currentIteration={snap.currentIteration} label="MSE / 2" yAxisLabel="Loss" />
      </div>
    </div>
  );
}
