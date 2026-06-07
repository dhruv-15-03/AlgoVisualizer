/**
 * Dimensionality-reduction visualization.
 *
 * Renders the projected 2D coordinates as an animated scatter plot. Used by
 * PCA (projects high-D data onto top-2 principal components) and t-SNE
 * (iteratively minimizes KL divergence in 2D).
 *
 * Bottom chart: variance explained per component (PCA bar chart) or t-SNE loss curve.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { TraceEvent } from '@/types/trace';
import type { Dataset } from '@/types/dataset';
import { LossChart } from './LossChart';
import { colorFor } from '@/lib/utils';

interface ProjectionVizProps {
  dataset: Dataset;
  events: TraceEvent[];
  currentStep: number;
}

interface ProjectionSnapshot {
  label: string;
  projected: number[][] | null;
  varianceExplained: number[] | null;
  lossHistory: Array<{ iteration: number; loss: number }>;
  currentIteration: number | null;
}

function snapshot(events: TraceEvent[], upTo: number): ProjectionSnapshot {
  let label = 'Projection';
  let projected: number[][] | null = null;
  let varianceExplained: number[] | null = null;
  const lossHistory: Array<{ iteration: number; loss: number }> = [];
  let currentIteration: number | null = null;
  for (let i = 0; i <= upTo && i < events.length; i += 1) {
    const e = events[i];
    if (e.type === 'projection:init') {
      label = e.label;
    } else if (e.type === 'projection:step') {
      label = e.label;
      projected = e.projected;
      varianceExplained = e.varianceExplained ?? varianceExplained;
      if (typeof e.loss === 'number') {
        const iter = e.iteration ?? lossHistory.length;
        lossHistory.push({ iteration: iter, loss: e.loss });
        currentIteration = iter;
      }
    } else if (e.type === 'projection:converged') {
      label = e.label;
      projected = e.projected;
      varianceExplained = e.varianceExplained ?? varianceExplained;
      currentIteration = e.iteration ?? currentIteration;
    }
  }
  return { label, projected, varianceExplained, lossHistory, currentIteration };
}

function ProjectedScatter({
  projected,
  classes,
  classNames,
}: {
  projected: number[][];
  classes: number[] | null;
  classNames?: string[];
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

  const xs = useMemo(() => projected.map((p) => p[0]), [projected]);
  const ys = useMemo(() => projected.map((p) => p[1]), [projected]);

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

            {projected.map((p, i) => (
              <circle
                key={i}
                cx={xScale(p[0])}
                cy={yScale(p[1])}
                r={3.5}
                fill={colorFor(classes?.[i] ?? 0)}
                fillOpacity={0.85}
                stroke="#0f172a"
                strokeWidth={0.5}
              />
            ))}

            <text x={innerW / 2} y={innerH + 32} textAnchor="middle" fill="#94a3b8" fontSize={11}>
              Component 1
            </text>
            <text
              transform={`translate(-32,${innerH / 2}) rotate(-90)`}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize={11}
            >
              Component 2
            </text>
            {classNames && (
              <g transform={`translate(${innerW - 100}, 4)`}>
                {classNames.slice(0, 6).map((name, i) => (
                  <g key={i} transform={`translate(0, ${i * 14})`}>
                    <circle cx={4} cy={5} r={3.5} fill={colorFor(i)} stroke="#0f172a" strokeWidth={0.5} />
                    <text x={12} y={8} fontSize={10} fill="#cbd5e1">
                      {name}
                    </text>
                  </g>
                ))}
              </g>
            )}
          </g>
        </svg>
      )}
    </div>
  );
}

function VarianceBars({ variance }: { variance: number[] }) {
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
  const padding = { top: 14, right: 14, bottom: 24, left: 36 };
  const innerW = Math.max(1, size.w - padding.left - padding.right);
  const innerH = Math.max(1, size.h - padding.top - padding.bottom);
  const total = variance.reduce((a, b) => a + b, 0) || 1;
  const ratios = variance.map((v) => v / total);
  const bw = innerW / ratios.length;
  return (
    <div ref={ref} className="h-full w-full">
      {size.w > 0 && size.h > 0 && (
        <svg width={size.w} height={size.h}>
          <g transform={`translate(${padding.left},${padding.top})`}>
            <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke="#334155" />
            {ratios.map((r, i) => {
              const h = r * innerH;
              return (
                <g key={i}>
                  <rect x={i * bw + 2} y={innerH - h} width={bw - 4} height={h} fill={colorFor(i)} fillOpacity={0.7} stroke={colorFor(i)} />
                  <text x={i * bw + bw / 2} y={innerH + 14} textAnchor="middle" fill="#64748b" fontSize={10} fontFamily="JetBrains Mono">
                    PC{i + 1}
                  </text>
                  <text x={i * bw + bw / 2} y={innerH - h - 4} textAnchor="middle" fill="#cbd5e1" fontSize={10} fontFamily="JetBrains Mono">
                    {(r * 100).toFixed(1)}%
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      )}
    </div>
  );
}

export function ProjectionViz({ dataset, events, currentStep }: ProjectionVizProps) {
  const snap = useMemo(() => snapshot(events, currentStep), [events, currentStep]);
  return (
    <div className="grid h-full grid-rows-[3fr,1fr] gap-3">
      <div className="min-h-0 rounded-lg border border-ink-700/50 bg-ink-900/50 p-2">
        {snap.projected ? (
          <ProjectedScatter projected={snap.projected} classes={dataset.y} classNames={dataset.classNames} />
        ) : (
          <div className="grid h-full place-items-center text-xs text-ink-400">Run to project the data.</div>
        )}
      </div>
      <div className="min-h-0 rounded-lg border border-ink-700/50 bg-ink-900/50 p-2">
        {snap.varianceExplained ? (
          <VarianceBars variance={snap.varianceExplained} />
        ) : snap.lossHistory.length > 0 ? (
          <LossChart history={snap.lossHistory} currentIteration={snap.currentIteration} label="KL divergence" yAxisLabel="Loss" />
        ) : (
          <div className="grid h-full place-items-center text-xs text-ink-400">Waiting for metrics…</div>
        )}
      </div>
    </div>
  );
}
