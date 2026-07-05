/**
 * CNN visualization: sample inputs + predictions, learned filters, feature maps,
 * and a training curve. Designed for the small "shapes" image dataset.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { TraceEvent } from '@/types/trace';
import type { Dataset } from '@/types/dataset';
import { colorFor } from '@/lib/utils';

interface CNNVizProps {
  dataset: Dataset;
  events: TraceEvent[];
  currentStep: number;
}

interface CNNSnapshot {
  filters: number[][][] | null;
  filterSize: [number, number] | null;
  imageShape: [number, number] | null;
  sampleInputs: number[][][] | null;
  sampleLabels: number[] | null;
  sampleFeatureMaps: number[][][][] | null;
  samplePredictions: number[][] | null;
  loss: number | null;
  accuracy: number | null;
  iteration: number | null;
  lossHistory: Array<{ iteration: number; loss: number; accuracy: number }>;
}

function snapshot(events: TraceEvent[], upTo: number): CNNSnapshot {
  let filters: number[][][] | null = null;
  let filterSize: [number, number] | null = null;
  let imageShape: [number, number] | null = null;
  let sampleInputs: number[][][] | null = null;
  let sampleLabels: number[] | null = null;
  let sampleFeatureMaps: number[][][][] | null = null;
  let samplePredictions: number[][] | null = null;
  let loss: number | null = null;
  let accuracy: number | null = null;
  let iteration: number | null = null;
  const lossHistory: Array<{ iteration: number; loss: number; accuracy: number }> = [];

  for (let i = 0; i <= upTo && i < events.length; i += 1) {
    const e = events[i];
    if (e.type === 'cnn:init') {
      filters = e.filters;
      filterSize = e.filterSize;
      imageShape = e.imageShape;
      sampleInputs = e.sampleInputs;
      sampleLabels = e.sampleLabels;
      sampleFeatureMaps = e.sampleFeatureMaps;
      samplePredictions = e.samplePredictions;
      loss = e.loss;
      accuracy = e.accuracy;
      lossHistory.push({ iteration: -1, loss: e.loss, accuracy: e.accuracy });
    } else if (e.type === 'cnn:step') {
      filters = e.filters;
      if (e.sampleFeatureMaps) sampleFeatureMaps = e.sampleFeatureMaps;
      if (e.samplePredictions) samplePredictions = e.samplePredictions;
      loss = e.loss;
      accuracy = e.accuracy;
      iteration = e.iteration ?? lossHistory.length;
      lossHistory.push({ iteration, loss: e.loss, accuracy: e.accuracy });
    } else if (e.type === 'cnn:converged') {
      filters = e.filters;
      sampleFeatureMaps = e.sampleFeatureMaps;
      samplePredictions = e.samplePredictions;
      loss = e.finalLoss;
      accuracy = e.finalAccuracy;
    }
  }
  return {
    filters,
    filterSize,
    imageShape,
    sampleInputs,
    sampleLabels,
    sampleFeatureMaps,
    samplePredictions,
    loss,
    accuracy,
    iteration,
    lossHistory,
  };
}

/** Encode a 2D float array as a canvas → dataURL grayscale image. */
function imageToDataUrl(img: number[][], min = 0, max = 1, palette: 'gray' | 'diverging' = 'gray'): string | null {
  if (!img.length) return null;
  const h = img.length;
  const w = img[0].length;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const imageData = ctx.createImageData(w, h);
  for (let r = 0; r < h; r += 1) {
    for (let c = 0; c < w; c += 1) {
      const v = img[r][c];
      const off = (r * w + c) * 4;
      if (palette === 'diverging') {
        // Centered at 0: negative = red, positive = green
        const norm = Math.max(-1, Math.min(1, v / Math.max(Math.abs(min), Math.abs(max), 1e-9)));
        if (norm >= 0) {
          imageData.data[off] = Math.round(40 + (1 - norm) * 180);
          imageData.data[off + 1] = Math.round(220 - (1 - norm) * 60);
          imageData.data[off + 2] = Math.round(120 - (1 - norm) * 40);
        } else {
          imageData.data[off] = Math.round(220 + norm * 60);
          imageData.data[off + 1] = Math.round(40 + (1 + norm) * 180);
          imageData.data[off + 2] = Math.round(80 + (1 + norm) * 80);
        }
        imageData.data[off + 3] = 255;
      } else {
        const norm = Math.max(0, Math.min(1, (v - min) / Math.max(1e-9, max - min)));
        const g = Math.round(norm * 255);
        imageData.data[off] = g;
        imageData.data[off + 1] = g;
        imageData.data[off + 2] = g;
        imageData.data[off + 3] = 255;
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
}

function ImageTile({
  img,
  size,
  palette,
  min,
  max,
  label,
  className,
}: {
  img: number[][];
  size: number;
  palette?: 'gray' | 'diverging';
  min?: number;
  max?: number;
  label?: string;
  className?: string;
}) {
  const url = useMemo(() => imageToDataUrl(img, min ?? 0, max ?? 1, palette ?? 'gray'), [img, min, max, palette]);
  return (
    <div className={`flex flex-col items-center gap-0.5 ${className ?? ''}`}>
      {url && (
        <img
          src={url}
          width={size}
          height={size}
          className="rounded border border-ink-700"
          style={{ imageRendering: 'pixelated' }}
          alt={label ?? ''}
        />
      )}
      {label && <span className="font-mono text-[9px] text-ink-400">{label}</span>}
    </div>
  );
}

function PredBars({ probs, classNames, trueLabel }: { probs: number[]; classNames?: string[]; trueLabel?: number }) {
  const argmax = probs.indexOf(Math.max(...probs));
  return (
    <div className="flex flex-col gap-1 text-[10px]">
      {probs.map((p, i) => {
        const label = classNames?.[i] ?? `Class ${i}`;
        const isPred = i === argmax;
        const isTrue = i === trueLabel;
        return (
          <div key={i} className="flex items-center gap-1.5">
            <span
              className={`w-12 font-mono ${isTrue ? 'text-accent-300' : 'text-ink-400'}`}
              title={isTrue ? 'True label' : ''}
            >
              {label.slice(0, 5)}
            </span>
            <div className="relative h-2.5 flex-1 overflow-hidden rounded-sm bg-ink-800">
              <div
                className="h-full rounded-sm"
                style={{
                  width: `${Math.max(2, p * 100)}%`,
                  background: colorFor(i),
                  opacity: isPred ? 1 : 0.55,
                }}
              />
            </div>
            <span className="w-9 text-right font-mono text-ink-300">{(p * 100).toFixed(0)}%</span>
          </div>
        );
      })}
    </div>
  );
}

function LossCurve({ history }: { history: Array<{ iteration: number; loss: number; accuracy: number }> }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const padding = { top: 8, right: 36, bottom: 22, left: 32 };
  const innerW = Math.max(1, size.w - padding.left - padding.right);
  const innerH = Math.max(1, size.h - padding.top - padding.bottom);

  const xs = history.map((h) => h.iteration);
  const xMin = xs.length ? Math.min(...xs) : 0;
  const xMax = xs.length ? Math.max(...xs) : 1;
  const losses = history.map((h) => h.loss);
  const lossMax = losses.length ? Math.max(...losses, 1e-6) : 1;

  const xScale = d3.scaleLinear().domain([xMin, xMax === xMin ? xMax + 1 : xMax]).range([0, innerW]);
  const lossScale = d3.scaleLinear().domain([0, lossMax * 1.05]).range([innerH, 0]);
  const accScale = d3.scaleLinear().domain([0, 1]).range([innerH, 0]);

  const lossPath = d3
    .line<{ iteration: number; loss: number; accuracy: number }>()
    .x((d) => xScale(d.iteration))
    .y((d) => lossScale(d.loss))(history);
  const accPath = d3
    .line<{ iteration: number; loss: number; accuracy: number }>()
    .x((d) => xScale(d.iteration))
    .y((d) => accScale(d.accuracy))(history);

  return (
    <div ref={ref} className="h-full w-full">
      {size.w > 0 && size.h > 0 && (
        <svg width={size.w} height={size.h}>
          <g transform={`translate(${padding.left},${padding.top})`}>
            <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke="#334155" />
            <line x1={0} y1={0} x2={0} y2={innerH} stroke="#334155" />
            <line x1={innerW} y1={0} x2={innerW} y2={innerH} stroke="#334155" />
            {lossPath && <path d={lossPath} fill="none" stroke="#f87171" strokeWidth={1.6} />}
            {accPath && <path d={accPath} fill="none" stroke="#34d399" strokeWidth={1.6} />}
            <text x={-6} y={6} fontSize={9} fill="#f87171" textAnchor="end">loss</text>
            <text x={innerW + 6} y={6} fontSize={9} fill="#34d399" textAnchor="start">acc</text>
            <text x={0} y={innerH + 14} fontSize={9} fill="#94a3b8">epoch {xMin}</text>
            <text x={innerW} y={innerH + 14} fontSize={9} fill="#94a3b8" textAnchor="end">{xMax}</text>
          </g>
        </svg>
      )}
    </div>
  );
}

export function CNNViz({ dataset, events, currentStep }: CNNVizProps) {
  const snap = useMemo(() => snapshot(events, currentStep), [events, currentStep]);
  const [activeSample, setActiveSample] = useState(0);

  const classNames = dataset.classNames;

  if (!snap.filters || !snap.sampleInputs) {
    return (
      <div className="grid h-full place-items-center rounded-lg border border-ink-700/50 bg-ink-900/50 text-sm text-ink-400">
        Press play to train the CNN.
      </div>
    );
  }

  const nFilters = snap.filters.length;
  const filterMax = Math.max(...snap.filters.flat(2).map((v) => Math.abs(v)), 1e-6);
  const activeIdx = Math.min(activeSample, snap.sampleInputs.length - 1);
  const activeInput = snap.sampleInputs[activeIdx];
  const activeMaps = snap.sampleFeatureMaps?.[activeIdx];
  const activePreds = snap.samplePredictions?.[activeIdx];
  const activeLabel = snap.sampleLabels?.[activeIdx];

  return (
    <div className="grid h-full grid-rows-[auto,auto,auto,1fr] gap-2 overflow-hidden">
      {/* Row 1: Sample selector + per-sample prediction */}
      <div className="rounded-lg border border-ink-700/50 bg-ink-900/50 p-2">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[10px] uppercase tracking-wider text-ink-400">Sample</div>
          <div className="flex gap-1">
            {snap.sampleInputs.map((img, i) => {
              const url = imageToDataUrl(img, 0, 1, 'gray');
              const isActive = i === activeIdx;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveSample(i)}
                  className={`flex flex-col items-center gap-0.5 rounded p-1 transition-colors ${
                    isActive ? 'bg-accent-500/20 ring-1 ring-accent-400' : 'hover:bg-ink-800'
                  }`}
                  title={classNames?.[snap.sampleLabels?.[i] ?? 0]}
                >
                  {url && (
                    <img
                      src={url}
                      width={36}
                      height={36}
                      className="rounded border border-ink-700"
                      style={{ imageRendering: 'pixelated' }}
                      alt=""
                    />
                  )}
                  <span className="font-mono text-[8px] text-ink-400">
                    {classNames?.[snap.sampleLabels?.[i] ?? 0]?.slice(0, 4) ?? `#${i}`}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="ml-auto flex gap-2 text-[10px] font-mono">
            {snap.loss !== null && (
              <span className="rounded-md bg-ink-800 px-2 py-1 text-ink-200">
                loss <span className="text-accent-300">{snap.loss.toFixed(4)}</span>
              </span>
            )}
            {snap.accuracy !== null && (
              <span className="rounded-md bg-ink-800 px-2 py-1 text-ink-200">
                acc <span className="text-accent-300">{(snap.accuracy * 100).toFixed(1)}%</span>
              </span>
            )}
          </div>
        </div>
        {activePreds && (
          <div className="mt-2 grid grid-cols-[120px,1fr] items-center gap-3">
            <ImageTile img={activeInput} size={104} label={classNames?.[activeLabel ?? 0]} />
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider text-ink-400">Prediction</div>
              <PredBars probs={activePreds} classNames={classNames} trueLabel={activeLabel} />
            </div>
          </div>
        )}
      </div>

      {/* Row 2: Learned filters */}
      <div className="rounded-lg border border-ink-700/50 bg-ink-900/50 p-2">
        <div className="mb-1 flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-wider text-ink-400">Learned filters (3×3, diverging)</div>
          <div className="font-mono text-[9px] text-ink-400">range ±{filterMax.toFixed(3)}</div>
        </div>
        <div className="flex flex-wrap gap-3">
          {snap.filters.map((F, i) => (
            <ImageTile
              key={i}
              img={F}
              size={56}
              palette="diverging"
              min={-filterMax}
              max={filterMax}
              label={`F${i}`}
            />
          ))}
          {Array.from({ length: Math.max(0, 4 - nFilters) }).map((_, i) => (
            <div key={`pad-${i}`} className="w-14" />
          ))}
        </div>
      </div>

      {/* Row 3: Feature maps for active sample */}
      <div className="rounded-lg border border-ink-700/50 bg-ink-900/50 p-2">
        <div className="mb-1 text-[10px] uppercase tracking-wider text-ink-400">
          Feature maps (after conv + ReLU) — {classNames?.[activeLabel ?? 0] ?? 'sample'}
        </div>
        {activeMaps ? (
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: nFilters }).map((_, fi) => {
              // activeMaps shape: [oh, ow, nf]; pull slice for filter fi
              const oh = activeMaps.length;
              const ow = activeMaps[0]?.length ?? 0;
              const single: number[][] = Array.from({ length: oh }, (_, r) =>
                Array.from({ length: ow }, (_, c) => activeMaps[r][c][fi] ?? 0),
              );
              const maxV = Math.max(...single.flat(), 1e-6);
              return (
                <ImageTile
                  key={fi}
                  img={single}
                  size={64}
                  palette="gray"
                  min={0}
                  max={maxV}
                  label={`F${fi} → ${oh}×${ow}`}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-ink-400">No feature maps emitted for this step (sub-sampled for perf).</div>
        )}
      </div>

      {/* Row 4: Loss/accuracy curve */}
      <div className="min-h-0 rounded-lg border border-ink-700/50 bg-ink-900/50 p-2">
        <div className="mb-0.5 text-[10px] uppercase tracking-wider text-ink-400">Training curve</div>
        <div className="h-[calc(100%-14px)]">
          <LossCurve history={snap.lossHistory} />
        </div>
      </div>
    </div>
  );
}
