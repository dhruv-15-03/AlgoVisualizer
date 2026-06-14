/**
 * Random Forest visualization.
 *
 * Top: decision boundary heatmap (latest snapshot) + scatter.
 * Bottom: small chart of OOB-style accuracy as more trees are added.
 *
 * The Python side emits a `forest:tree_grown` event per tree, with the
 * cumulative boundary grid attached only every few trees (to keep payloads
 * small).
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { TraceEvent } from '@/types/trace';
import type { Dataset } from '@/types/dataset';
import { LossChart } from './LossChart';
import { colorFor } from '@/lib/utils';

interface ForestVizProps {
  dataset: Dataset;
  events: TraceEvent[];
  currentStep: number;
}

interface ForestSnapshot {
  grid: number[] | null;
  gridSize: number | null;
  bbox: [number, number, number, number] | null;
  treeCount: number;
  totalTrees: number;
  accuracyHistory: Array<{ iteration: number; loss: number }>;
  currentIteration: number | null;
  latestSummary: { nodes: number; leaves: number; depth: number } | null;
  points: number[][] | null;
  pointAxisLabels: [string, string] | null;
}

function snapshot(events: TraceEvent[], upTo: number): ForestSnapshot {
  let grid: number[] | null = null;
  let gridSize: number | null = null;
  let bbox: [number, number, number, number] | null = null;
  let treeCount = 0;
  let totalTrees = 0;
  const accuracyHistory: Array<{ iteration: number; loss: number }> = [];
  let currentIteration: number | null = null;
  let latestSummary: { nodes: number; leaves: number; depth: number } | null = null;
  let points: number[][] | null = null;
  let pointAxisLabels: [string, string] | null = null;

  for (let i = 0; i <= upTo && i < events.length; i += 1) {
    const e = events[i];
    if (e.type === 'forest:tree_grown') {
      treeCount = e.treeIndex + 1;
      totalTrees = e.totalTrees;
      latestSummary = e.treeSummary;
      points = e.points ?? points;
      pointAxisLabels = e.pointAxisLabels ?? pointAxisLabels;
      if (e.grid) {
        grid = e.grid;
        gridSize = e.gridSize ?? gridSize;
        bbox = e.bbox ?? bbox;
      }
      accuracyHistory.push({ iteration: e.treeIndex, loss: e.ensembleAccuracy });
      currentIteration = e.treeIndex;
    } else if (e.type === 'forest:converged') {
      totalTrees = e.totalTrees;
      if (e.grid) {
        grid = e.grid;
        gridSize = e.gridSize ?? gridSize;
        bbox = e.bbox ?? bbox;
      }
    }
  }
  return { grid, gridSize, bbox, treeCount, totalTrees, accuracyHistory, currentIteration, latestSummary, points, pointAxisLabels };
}

function ForestBoundary({
  X,
  y,
  grid,
  gridSize,
  bbox,
  featureNames,
}: {
  X: number[][];
  y: number[] | null;
  grid: number[] | null;
  gridSize: number | null;
  bbox: [number, number, number, number] | null;
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
        imageData.data[off + 3] = Math.round(255 * 0.22);
      }
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
  }, [grid, gridSize]);

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
            {gridDataUrl && (
              <image href={gridDataUrl} x={0} y={0} width={innerW} height={innerH} preserveAspectRatio="none" style={{ imageRendering: 'pixelated' }} />
            )}
            {X.map((row, i) => (
              <circle
                key={i}
                cx={xScale(row[0])}
                cy={yScale(row[1])}
                r={3.2}
                fill={colorFor(y?.[i] ?? 0)}
                fillOpacity={0.9}
                stroke="#0f172a"
                strokeWidth={0.5}
              />
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

export function ForestViz({ dataset, events, currentStep }: ForestVizProps) {
  const snap = useMemo(() => snapshot(events, currentStep), [events, currentStep]);
  return (
    <div className="grid h-full grid-rows-[3fr,1fr] gap-3">
      <div className="relative min-h-0 rounded-lg border border-ink-700/50 bg-ink-900/50 p-2">
        <ForestBoundary X={snap.points ?? dataset.X} y={dataset.y} grid={snap.grid} gridSize={snap.gridSize} bbox={snap.bbox} featureNames={snap.pointAxisLabels ?? dataset.featureNames} />
        <div className="absolute right-3 top-2 flex gap-2 text-[10px] font-mono">
          <span className="rounded-md bg-ink-800/90 px-2 py-1 text-ink-200">
            trees <span className="text-accent-300">{snap.treeCount}/{snap.totalTrees}</span>
          </span>
          {snap.latestSummary && (
            <span className="rounded-md bg-ink-800/90 px-2 py-1 text-ink-200">
              depth <span className="text-accent-300">{snap.latestSummary.depth}</span>
            </span>
          )}
        </div>
      </div>
      <div className="min-h-0 rounded-lg border border-ink-700/50 bg-ink-900/50 p-2">
        {snap.accuracyHistory.length > 0 ? (
          <LossChart history={snap.accuracyHistory} currentIteration={snap.currentIteration} label="Accuracy" yAxisLabel="Accuracy" />
        ) : (
          <div className="grid h-full place-items-center text-xs text-ink-400">Run to grow the forest.</div>
        )}
      </div>
    </div>
  );
}
