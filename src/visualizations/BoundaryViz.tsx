/**
 * Generic 2D-classifier visualization.
 *
 * Renders an NxN grid of class predictions as a heatmap behind the scatter
 * points. Used by KNN, Naive Bayes, SVM, Random Forest, MLP — any algorithm
 * that emits `boundary:step` events with a precomputed prediction grid.
 *
 * Support vectors (SVM) and other per-point highlights are drawn with a
 * brighter stroke.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { TraceEvent } from '@/types/trace';
import type { Dataset } from '@/types/dataset';
import { LossChart } from './LossChart';
import { colorFor } from '@/lib/utils';

interface BoundaryVizProps {
  dataset: Dataset;
  events: TraceEvent[];
  currentStep: number;
}

interface BoundarySnapshot {
  label: string;
  grid: number[] | null;
  gridSize: number | null;
  bbox: [number, number, number, number] | null;
  history: Array<{ iteration: number; loss: number }>;
  accuracyHistory: Array<{ iteration: number; loss: number }>;
  currentIteration: number | null;
  supportVectors: number[] | null;
  hasLossHistory: boolean;
  points: number[][] | null;
  pointAxisLabels: [string, string] | null;
}

function snapshot(events: TraceEvent[], upTo: number): BoundarySnapshot {
  let label = 'Classifier';
  let grid: number[] | null = null;
  let gridSize: number | null = null;
  let bbox: [number, number, number, number] | null = null;
  let supportVectors: number[] | null = null;
  const history: Array<{ iteration: number; loss: number }> = [];
  const accuracyHistory: Array<{ iteration: number; loss: number }> = [];
  let currentIteration: number | null = null;
  let hasLossHistory = false;
  let points: number[][] | null = null;
  let pointAxisLabels: [string, string] | null = null;

  for (let i = 0; i <= upTo && i < events.length; i += 1) {
    const e = events[i];
    if (e.type === 'boundary:init') {
      label = e.label;
      points = e.points ?? points;
      pointAxisLabels = e.pointAxisLabels ?? pointAxisLabels;
    } else if (e.type === 'boundary:step') {
      label = e.label;
      grid = e.grid;
      gridSize = e.gridSize;
      bbox = e.bbox;
      supportVectors = e.supportVectors ?? supportVectors;
      const iter = e.iteration ?? history.length;
      if (typeof e.loss === 'number') {
        history.push({ iteration: iter, loss: e.loss });
        hasLossHistory = true;
      }
      if (typeof e.accuracy === 'number') {
        accuracyHistory.push({ iteration: iter, loss: e.accuracy });
      }
      currentIteration = iter;
    } else if (e.type === 'boundary:converged') {
      label = e.label;
      currentIteration = e.iteration ?? currentIteration;
    }
  }
  return {
    label,
    grid,
    gridSize,
    bbox,
    history,
    accuracyHistory,
    currentIteration,
    supportVectors,
    hasLossHistory,
    points,
    pointAxisLabels,
  };
}

function GridBoundaryChart({
  X,
  y,
  grid,
  gridSize,
  bbox,
  supportVectors,
  featureNames,
  numClasses,
}: {
  X: number[][];
  y: number[] | null;
  grid: number[] | null;
  gridSize: number | null;
  bbox: [number, number, number, number] | null;
  supportVectors: number[] | null;
  featureNames?: string[];
  numClasses: number;
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
    if (bbox) return d3.scaleLinear().domain([bbox[0], bbox[1]]).range([0, innerW]);
    const [a, b] = d3.extent(xs) as [number, number];
    const lo = a ?? 0;
    const hi = b ?? 1;
    const pad = (hi - lo) * 0.1 || 0.5;
    return d3.scaleLinear().domain([lo - pad, hi + pad]).range([0, innerW]);
  }, [xs, innerW, bbox]);

  const yScale = useMemo(() => {
    if (bbox) return d3.scaleLinear().domain([bbox[2], bbox[3]]).range([innerH, 0]);
    const [a, b] = d3.extent(ys) as [number, number];
    const lo = a ?? 0;
    const hi = b ?? 1;
    const pad = (hi - lo) * 0.1 || 0.5;
    return d3.scaleLinear().domain([lo - pad, hi + pad]).range([innerH, 0]);
  }, [ys, innerH, bbox]);

  const supportSet = useMemo(() => new Set(supportVectors ?? []), [supportVectors]);

  // Render the grid as a single SVG image (data URL) to keep the DOM light.
  const gridDataUrl = useMemo(() => {
    if (!grid || !gridSize) return null;
    const canvas = document.createElement('canvas');
    canvas.width = gridSize;
    canvas.height = gridSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const imageData = ctx.createImageData(gridSize, gridSize);
    for (let py = 0; py < gridSize; py += 1) {
      for (let px = 0; px < gridSize; px += 1) {
        // Grid is row-major from y_min upward; SVG y is downward, so flip.
        const srcIdx = (gridSize - 1 - py) * gridSize + px;
        const cls = grid[srcIdx];
        const hex = colorFor(cls ?? 0);
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const off = (py * gridSize + px) * 4;
        imageData.data[off] = r;
        imageData.data[off + 1] = g;
        imageData.data[off + 2] = b;
        imageData.data[off + 3] = Math.round(255 * 0.22); // translucent fill
      }
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, gridSize, numClasses]);

  return (
    <div ref={ref} className="h-full w-full">
      {size.w > 0 && size.h > 0 && (
        <svg width={size.w} height={size.h}>
          <defs>
            <clipPath id="boundary-clip">
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

            <g clipPath="url(#boundary-clip)">
              {gridDataUrl && (
                <image
                  href={gridDataUrl}
                  x={0}
                  y={0}
                  width={innerW}
                  height={innerH}
                  preserveAspectRatio="none"
                  style={{ imageRendering: 'pixelated' }}
                />
              )}
              {X.map((row, i) => {
                const isSV = supportSet.has(i);
                return (
                  <circle
                    key={i}
                    cx={xScale(row[0])}
                    cy={yScale(row[1])}
                    r={isSV ? 5 : 3.4}
                    fill={colorFor(y?.[i] ?? 0)}
                    fillOpacity={0.9}
                    stroke={isSV ? '#fbbf24' : '#0f172a'}
                    strokeWidth={isSV ? 1.6 : 0.6}
                  />
                );
              })}
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

export function BoundaryViz({ dataset, events, currentStep }: BoundaryVizProps) {
  const snap = useMemo(() => snapshot(events, currentStep), [events, currentStep]);
  const numClasses = useMemo(() => {
    if (!dataset.y) return 2;
    return new Set(dataset.y).size;
  }, [dataset.y]);

  return (
    <div className="grid h-full grid-rows-[3fr,1fr] gap-3">
      <div className="min-h-0 rounded-lg border border-ink-700/50 bg-ink-900/50 p-2">
        <GridBoundaryChart
          X={snap.points ?? dataset.X}
          y={dataset.y}
          grid={snap.grid}
          gridSize={snap.gridSize}
          bbox={snap.bbox}
          supportVectors={snap.supportVectors}
          featureNames={snap.pointAxisLabels ?? dataset.featureNames}
          numClasses={numClasses}
        />
      </div>
      <div className="min-h-0 rounded-lg border border-ink-700/50 bg-ink-900/50 p-2">
        {snap.hasLossHistory ? (
          <LossChart
            history={snap.history}
            currentIteration={snap.currentIteration}
            label="Loss"
            yAxisLabel="Loss"
          />
        ) : (
          <LossChart
            history={snap.accuracyHistory}
            currentIteration={snap.currentIteration}
            label="Accuracy"
            yAxisLabel="Accuracy"
          />
        )}
      </div>
    </div>
  );
}
