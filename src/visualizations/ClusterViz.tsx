/**
 * Generic clustering visualization.
 *
 * Renders points colored by cluster label, with optional cluster centers
 * (GMM) and covariance ellipses. Used by DBSCAN, Hierarchical, GMM.
 *
 * Label -1 is treated as noise/unassigned (rendered gray).
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { TraceEvent } from '@/types/trace';
import type { Dataset } from '@/types/dataset';
import { LossChart } from './LossChart';
import { colorFor } from '@/lib/utils';

interface ClusterVizProps {
  dataset: Dataset;
  events: TraceEvent[];
  currentStep: number;
}

interface ClusterSnapshot {
  label: string;
  labels: number[] | null;
  centers: number[][] | null;
  covariances: number[][] | null;
  history: Array<{ iteration: number; loss: number }>;
  metricLabel: string;
  numClusters: number;
  currentIteration: number | null;
}

function snapshot(events: TraceEvent[], upTo: number): ClusterSnapshot {
  let label = 'Clustering';
  let labels: number[] | null = null;
  let centers: number[][] | null = null;
  let covariances: number[][] | null = null;
  const history: Array<{ iteration: number; loss: number }> = [];
  let metricLabel = 'Metric';
  let numClusters = 0;
  let currentIteration: number | null = null;
  for (let i = 0; i <= upTo && i < events.length; i += 1) {
    const e = events[i];
    if (e.type === 'cluster:init') {
      label = e.label;
    } else if (e.type === 'cluster:step') {
      label = e.label;
      labels = e.labels;
      centers = e.centers ?? centers;
      covariances = e.covariances ?? covariances;
      if (typeof e.metric === 'number') {
        const iter = e.iteration ?? history.length;
        history.push({ iteration: iter, loss: e.metric });
        currentIteration = iter;
      }
      metricLabel = e.metricLabel ?? metricLabel;
      if (e.labels) {
        const u = new Set(e.labels.filter((l) => l >= 0));
        numClusters = u.size;
      }
    } else if (e.type === 'cluster:merge') {
      label = e.label;
      labels = e.labels;
      numClusters = e.numClusters;
      const iter = history.length;
      history.push({ iteration: iter, loss: e.distance });
      currentIteration = iter;
      metricLabel = 'Merge distance';
    } else if (e.type === 'cluster:converged') {
      label = e.label;
      labels = e.labels;
      numClusters = e.numClusters;
      currentIteration = e.iteration ?? currentIteration;
    }
  }
  return { label, labels, centers, covariances, history, metricLabel, numClusters, currentIteration };
}

function ClusterScatter({
  X,
  labels,
  centers,
  covariances,
  featureNames,
}: {
  X: number[][];
  labels: number[] | null;
  centers: number[][] | null;
  covariances: number[][] | null;
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

            {/* Covariance ellipses (GMM) — render under points */}
            {covariances?.map((cov, i) => {
              if (!cov || cov.length < 5) return null;
              const [cx, cy, sxx, sxy, syy] = cov;
              // Eigendecompose [[sxx, sxy], [sxy, syy]].
              const trace = sxx + syy;
              const det = sxx * syy - sxy * sxy;
              const disc = Math.max(0, (trace * trace) / 4 - det);
              const sq = Math.sqrt(disc);
              const l1 = trace / 2 + sq;
              const l2 = trace / 2 - sq;
              const r1 = Math.sqrt(Math.max(1e-6, l1)) * 2;
              const r2 = Math.sqrt(Math.max(1e-6, l2)) * 2;
              const angleRad = Math.atan2(2 * sxy, sxx - syy) / 2;
              const angleDeg = (angleRad * 180) / Math.PI;
              const ux = xScale(cx + r1 * Math.cos(angleRad)) - xScale(cx);
              const uy = yScale(cy + r1 * Math.sin(angleRad)) - yScale(cy);
              const rx = Math.sqrt(ux * ux + uy * uy);
              const vx = xScale(cx - r2 * Math.sin(angleRad)) - xScale(cx);
              const vy = yScale(cy + r2 * Math.cos(angleRad)) - yScale(cy);
              const ry = Math.sqrt(vx * vx + vy * vy);
              return (
                <ellipse
                  key={`ell-${i}`}
                  cx={xScale(cx)}
                  cy={yScale(cy)}
                  rx={rx}
                  ry={ry}
                  transform={`rotate(${-angleDeg}, ${xScale(cx)}, ${yScale(cy)})`}
                  fill={colorFor(i)}
                  fillOpacity={0.08}
                  stroke={colorFor(i)}
                  strokeOpacity={0.55}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                />
              );
            })}

            {X.map((row, i) => {
              const lbl = labels?.[i] ?? -1;
              const noise = lbl < 0;
              return (
                <circle
                  key={i}
                  cx={xScale(row[0])}
                  cy={yScale(row[1])}
                  r={noise ? 2.4 : 3.6}
                  fill={noise ? '#475569' : colorFor(lbl)}
                  fillOpacity={noise ? 0.55 : 0.9}
                  stroke="#0f172a"
                  strokeWidth={0.5}
                />
              );
            })}

            {centers?.map((c, i) => (
              <g key={`c${i}`} transform={`translate(${xScale(c[0])},${yScale(c[1])})`}>
                <circle r={10} fill={colorFor(i)} fillOpacity={0.18} />
                <circle r={6} fill={colorFor(i)} stroke="#0f172a" strokeWidth={2} />
                <text x={0} y={3} textAnchor="middle" fill="#0f172a" fontSize={9} fontFamily="JetBrains Mono" fontWeight="700">
                  {i}
                </text>
              </g>
            ))}

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

export function ClusterViz({ dataset, events, currentStep }: ClusterVizProps) {
  const snap = useMemo(() => snapshot(events, currentStep), [events, currentStep]);
  return (
    <div className="grid h-full grid-rows-[3fr,1fr] gap-3">
      <div className="min-h-0 rounded-lg border border-ink-700/50 bg-ink-900/50 p-2">
        <ClusterScatter
          X={dataset.X}
          labels={snap.labels}
          centers={snap.centers}
          covariances={snap.covariances}
          featureNames={dataset.featureNames}
        />
      </div>
      <div className="min-h-0 rounded-lg border border-ink-700/50 bg-ink-900/50 p-2">
        {snap.history.length > 0 ? (
          <LossChart
            history={snap.history}
            currentIteration={snap.currentIteration}
            label={snap.metricLabel}
            yAxisLabel={snap.metricLabel}
          />
        ) : (
          <div className="grid h-full place-items-center text-xs text-ink-400">
            {snap.numClusters > 0 ? `${snap.numClusters} clusters · waiting for metrics…` : 'Run to see clustering metrics.'}
          </div>
        )}
      </div>
    </div>
  );
}
