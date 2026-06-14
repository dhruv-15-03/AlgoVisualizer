/**
 * Multi-Layer Perceptron visualization.
 *
 * Top: decision boundary grid (same as BoundaryViz) with input scatter.
 * Bottom: network diagram with neurons and edges, edge color/thickness reflects
 *         weight sign and magnitude. Loss + accuracy shown as small inline chips.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { TraceEvent } from '@/types/trace';
import type { Dataset } from '@/types/dataset';
import { colorFor } from '@/lib/utils';

interface MLPVizProps {
  dataset: Dataset;
  events: TraceEvent[];
  currentStep: number;
}

interface MLPSnapshot {
  layers: number[] | null;
  weights: number[][][] | null;
  grid: number[] | null;
  gridSize: number | null;
  bbox: [number, number, number, number] | null;
  loss: number | null;
  accuracy: number | null;
  iteration: number | null;
  lossHistory: Array<{ iteration: number; loss: number }>;
  points: number[][] | null;
  pointAxisLabels: [string, string] | null;
}

function snapshot(events: TraceEvent[], upTo: number): MLPSnapshot {
  let layers: number[] | null = null;
  let weights: number[][][] | null = null;
  let grid: number[] | null = null;
  let gridSize: number | null = null;
  let bbox: [number, number, number, number] | null = null;
  let loss: number | null = null;
  let accuracy: number | null = null;
  let iteration: number | null = null;
  const lossHistory: Array<{ iteration: number; loss: number }> = [];
  let points: number[][] | null = null;
  let pointAxisLabels: [string, string] | null = null;
  for (let i = 0; i <= upTo && i < events.length; i += 1) {
    const e = events[i];
    if (e.type === 'mlp:init') {
      layers = e.layers;
      weights = e.weights;
      loss = e.loss;
      accuracy = e.accuracy;
      points = e.points ?? points;
      pointAxisLabels = e.pointAxisLabels ?? pointAxisLabels;
      lossHistory.push({ iteration: -1, loss: e.loss });
    } else if (e.type === 'mlp:step') {
      layers = e.layers;
      weights = e.weights;
      grid = e.grid ?? grid;
      gridSize = e.gridSize ?? gridSize;
      bbox = e.bbox ?? bbox;
      loss = e.loss;
      accuracy = e.accuracy;
      iteration = e.iteration ?? lossHistory.length;
      lossHistory.push({ iteration, loss: e.loss });
    } else if (e.type === 'mlp:converged') {
      layers = e.layers;
      weights = e.weights;
      loss = e.finalLoss;
      accuracy = e.finalAccuracy;
    }
  }
  return { layers, weights, grid, gridSize, bbox, loss, accuracy, iteration, lossHistory, points, pointAxisLabels };
}

function BoundaryTop({
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

  const padding = { top: 10, right: 10, bottom: 28, left: 36 };
  const innerW = Math.max(1, size.w - padding.left - padding.right);
  const innerH = Math.max(1, size.h - padding.top - padding.bottom);

  const xs = useMemo(() => X.map((r) => r[0]), [X]);
  const ys = useMemo(() => X.map((r) => r[1]), [X]);

  const xScale = useMemo(() => {
    if (bbox) return d3.scaleLinear().domain([bbox[0], bbox[1]]).range([0, innerW]);
    const [a, b] = d3.extent(xs) as [number, number];
    return d3.scaleLinear().domain([a ?? 0, b ?? 1]).range([0, innerW]);
  }, [xs, innerW, bbox]);

  const yScale = useMemo(() => {
    if (bbox) return d3.scaleLinear().domain([bbox[2], bbox[3]]).range([innerH, 0]);
    const [a, b] = d3.extent(ys) as [number, number];
    return d3.scaleLinear().domain([a ?? 0, b ?? 1]).range([innerH, 0]);
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
            <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke="#334155" />
            <line x1={0} y1={0} x2={0} y2={innerH} stroke="#334155" />
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
            {featureNames?.[0] && (
              <text x={innerW / 2} y={innerH + 22} textAnchor="middle" fill="#94a3b8" fontSize={10}>
                {featureNames[0]}
              </text>
            )}
            {featureNames?.[1] && (
              <text transform={`translate(-26,${innerH / 2}) rotate(-90)`} textAnchor="middle" fill="#94a3b8" fontSize={10}>
                {featureNames[1]}
              </text>
            )}
          </g>
        </svg>
      )}
    </div>
  );
}

function NetworkDiagram({
  layers,
  weights,
}: {
  layers: number[];
  weights: number[][][] | null;
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

  const padding = { top: 18, right: 36, bottom: 18, left: 36 };
  const innerW = Math.max(1, size.w - padding.left - padding.right);
  const innerH = Math.max(1, size.h - padding.top - padding.bottom);
  const colStep = layers.length > 1 ? innerW / (layers.length - 1) : innerW / 2;

  const maxWeight = useMemo(() => {
    if (!weights) return 1;
    let m = 0;
    weights.forEach((W) => W.forEach((row) => row.forEach((v) => { if (Math.abs(v) > m) m = Math.abs(v); })));
    return Math.max(0.001, m);
  }, [weights]);

  const layerPositions = useMemo(() => {
    return layers.map((nUnits, li) => {
      const cx = padding.left + li * colStep;
      const ys: number[] = [];
      for (let i = 0; i < nUnits; i += 1) {
        const ratio = nUnits === 1 ? 0.5 : i / (nUnits - 1);
        ys.push(padding.top + ratio * innerH);
      }
      return { cx, ys };
    });
  }, [layers, colStep, padding.left, padding.top, innerH]);

  return (
    <div ref={ref} className="h-full w-full">
      {size.w > 0 && size.h > 0 && (
        <svg width={size.w} height={size.h}>
          {weights?.map((W, li) => {
            const from = layerPositions[li];
            const to = layerPositions[li + 1];
            if (!from || !to) return null;
            return (
              <g key={`edges-${li}`}>
                {W.map((row, i) =>
                  row.map((w, j) => {
                    const abs = Math.abs(w);
                    if (abs / maxWeight < 0.05) return null;
                    const stroke = w >= 0 ? '#34d399' : '#f87171';
                    return (
                      <line
                        key={`e-${li}-${i}-${j}`}
                        x1={from.cx}
                        y1={from.ys[i]}
                        x2={to.cx}
                        y2={to.ys[j]}
                        stroke={stroke}
                        strokeOpacity={0.25 + 0.55 * (abs / maxWeight)}
                        strokeWidth={0.6 + 2.4 * (abs / maxWeight)}
                      />
                    );
                  }),
                )}
              </g>
            );
          })}
          {layerPositions.map((pos, li) => (
            <g key={`layer-${li}`}>
              {pos.ys.map((cy, i) => (
                <circle
                  key={i}
                  cx={pos.cx}
                  cy={cy}
                  r={li === 0 || li === layerPositions.length - 1 ? 8 : 6}
                  fill={li === layerPositions.length - 1 ? '#fbbf24' : li === 0 ? '#60a5fa' : '#a78bfa'}
                  fillOpacity={0.9}
                  stroke="#0f172a"
                  strokeWidth={1}
                />
              ))}
              <text x={pos.cx} y={padding.top - 6} textAnchor="middle" fill="#94a3b8" fontSize={10}>
                {li === 0 ? 'Input' : li === layers.length - 1 ? 'Output' : `Hidden ${li}`}
              </text>
              <text x={pos.cx} y={padding.top + innerH + 12} textAnchor="middle" fill="#64748b" fontSize={9} fontFamily="JetBrains Mono">
                {layers[li]} units
              </text>
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}

export function MLPViz({ dataset, events, currentStep }: MLPVizProps) {
  const snap = useMemo(() => snapshot(events, currentStep), [events, currentStep]);
  return (
    <div className="grid h-full grid-rows-[3fr,2fr] gap-3">
      <div className="min-h-0 rounded-lg border border-ink-700/50 bg-ink-900/50 p-2 relative">
        <BoundaryTop
          X={snap.points ?? dataset.X}
          y={dataset.y}
          grid={snap.grid}
          gridSize={snap.gridSize}
          bbox={snap.bbox}
          featureNames={snap.pointAxisLabels ?? dataset.featureNames}
        />
        <div className="absolute right-3 top-2 flex gap-2 text-[10px] font-mono">
          {snap.loss !== null && (
            <span className="rounded-md bg-ink-800/90 px-2 py-1 text-ink-200">loss <span className="text-accent-300">{snap.loss.toFixed(4)}</span></span>
          )}
          {snap.accuracy !== null && (
            <span className="rounded-md bg-ink-800/90 px-2 py-1 text-ink-200">acc <span className="text-accent-300">{(snap.accuracy * 100).toFixed(1)}%</span></span>
          )}
        </div>
      </div>
      <div className="min-h-0 rounded-lg border border-ink-700/50 bg-ink-900/50 p-2">
        {snap.layers && snap.weights ? (
          <NetworkDiagram layers={snap.layers} weights={snap.weights} />
        ) : (
          <div className="grid h-full place-items-center text-xs text-ink-400">Run to see the network.</div>
        )}
      </div>
    </div>
  );
}
