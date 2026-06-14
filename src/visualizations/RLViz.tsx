/**
 * Reinforcement-learning visualization (gridworld).
 *
 * Renders the environment as a grid where each cell is shaded by its learned
 * state value (max_a Q[s,a], V[s], or policy confidence — whatever the active
 * algorithm reports), overlaid with the greedy policy arrow per cell and the
 * agent's path from the most recent episode. The bottom chart tracks reward per
 * episode so you can watch the policy improve.
 *
 * Shared by Q-Learning, DQN, REINFORCE and Actor-Critic — all emit the same
 * `rl:*` event family, so this one component renders every RL algorithm.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { TraceEvent } from '@/types/trace';
import type { Dataset } from '@/types/dataset';
import { LossChart } from './LossChart';
import { formatNumber } from '@/lib/utils';

interface RLVizProps {
  dataset: Dataset;
  events: TraceEvent[];
  currentStep: number;
}

interface RLSnapshot {
  label: string;
  rows: number;
  cols: number;
  grid: number[];
  values: number[] | null;
  policy: number[] | null;
  path: number[] | null;
  rewardHistory: Array<{ iteration: number; loss: number }>;
  episode: number | null;
  reward: number | null;
  steps: number | null;
  epsilon: number | null;
  currentIteration: number | null;
}

// Cell codes (mirrors src/datasets/gridworld.ts + the Python env). 0 = empty.
const WALL = 1;
const GOAL = 2;
const TRAP = 3;
const START = 4;

// Action → arrow glyph. 0 up · 1 right · 2 down · 3 left.
const ARROWS = ['↑', '→', '↓', '←'];

function snapshot(events: TraceEvent[], upTo: number): RLSnapshot {
  let label = 'Policy';
  let rows = 0;
  let cols = 0;
  let grid: number[] = [];
  let values: number[] | null = null;
  let policy: number[] | null = null;
  let path: number[] | null = null;
  const rewardHistory: Array<{ iteration: number; loss: number }> = [];
  let episode: number | null = null;
  let reward: number | null = null;
  let steps: number | null = null;
  let epsilon: number | null = null;
  let currentIteration: number | null = null;

  for (let i = 0; i <= upTo && i < events.length; i += 1) {
    const e = events[i];
    if (e.type === 'rl:init') {
      label = e.label;
      rows = e.rows;
      cols = e.cols;
      grid = e.grid;
    } else if (e.type === 'rl:episode') {
      label = e.label;
      values = e.values;
      policy = e.policy;
      path = e.path ?? null;
      episode = e.episode;
      reward = e.reward;
      steps = e.steps;
      epsilon = e.epsilon ?? null;
      rewardHistory.push({ iteration: e.episode, loss: e.reward });
      currentIteration = e.episode;
    } else if (e.type === 'rl:converged') {
      label = e.label;
      values = e.values;
      policy = e.policy;
    }
  }

  return {
    label,
    rows,
    cols,
    grid,
    values,
    policy,
    path,
    rewardHistory,
    episode,
    reward,
    steps,
    epsilon,
    currentIteration,
  };
}

function GridBoard({ snap }: { snap: RLSnapshot }) {
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

  const { rows, cols, grid, values, policy, path } = snap;

  // Value colour scale — only over walkable, non-terminal cells so terminals
  // (rendered in their own colours) don't skew the domain.
  const color = useMemo(() => {
    if (!values) return null;
    const walkable: number[] = [];
    for (let s = 0; s < values.length; s += 1) {
      const c = grid[s];
      if (c !== WALL && c !== GOAL && c !== TRAP) walkable.push(values[s]);
    }
    const lo = walkable.length ? Math.min(...walkable) : 0;
    const hi = walkable.length ? Math.max(...walkable) : 1;
    return d3.scaleSequential(d3.interpolateViridis).domain([lo, hi === lo ? lo + 1e-6 : hi]);
  }, [values, grid]);

  const cell = Math.max(0, Math.min(size.w / (cols || 1), size.h / (rows || 1)));
  const boardW = cell * cols;
  const boardH = cell * rows;
  const offX = (size.w - boardW) / 2;
  const offY = (size.h - boardH) / 2;

  const pathPts = useMemo(() => {
    if (!path || cols === 0) return '';
    return path
      .map((s) => {
        const r = Math.floor(s / cols);
        const c = s % cols;
        return `${c * cell + cell / 2},${r * cell + cell / 2}`;
      })
      .join(' ');
  }, [path, cols, cell]);

  return (
    <div ref={ref} className="h-full w-full">
      {size.w > 0 && size.h > 0 && rows > 0 && cols > 0 && (
        <svg width={size.w} height={size.h}>
          <g transform={`translate(${offX},${offY})`}>
            {grid.map((code, s) => {
              const r = Math.floor(s / cols);
              const c = s % cols;
              const x = c * cell;
              const y = r * cell;
              let fill = '#0b1220';
              if (code === WALL) fill = '#0b1220';
              else if (code === GOAL) fill = 'rgba(45,212,167,0.85)';
              else if (code === TRAP) fill = 'rgba(255,93,143,0.85)';
              else fill = color && values ? color(values[s]) : '#13243a';
              return (
                <rect
                  key={s}
                  x={x + 1}
                  y={y + 1}
                  width={cell - 2}
                  height={cell - 2}
                  rx={3}
                  fill={fill}
                  stroke={code === WALL ? '#1e293b' : '#0f172a'}
                  strokeWidth={code === WALL ? 1.5 : 0.75}
                />
              );
            })}

            {/* Agent path from the latest episode. */}
            {pathPts && (
              <polyline
                points={pathPts}
                fill="none"
                stroke="#fbbf24"
                strokeWidth={Math.max(1.5, cell * 0.05)}
                strokeOpacity={0.55}
                strokeLinejoin="round"
                strokeLinecap="round"
                pointerEvents="none"
              />
            )}

            {/* Policy arrows + cell markers. */}
            {grid.map((code, s) => {
              const r = Math.floor(s / cols);
              const c = s % cols;
              const cx = c * cell + cell / 2;
              const cy = r * cell + cell / 2;
              if (code === WALL) return null;
              if (code === GOAL || code === TRAP || code === START) {
                const ch = code === GOAL ? 'G' : code === TRAP ? 'T' : 'S';
                const tone = code === START ? '#e2e8f0' : '#0b1220';
                return (
                  <text
                    key={`m${s}`}
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={Math.max(10, cell * 0.34)}
                    fontWeight={700}
                    fill={tone}
                    pointerEvents="none"
                  >
                    {ch}
                  </text>
                );
              }
              const a = policy?.[s] ?? -1;
              if (a < 0) return null;
              return (
                <text
                  key={`a${s}`}
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={Math.max(11, cell * 0.4)}
                  fill="#e2e8f0"
                  fillOpacity={0.92}
                  pointerEvents="none"
                >
                  {ARROWS[a]}
                </text>
              );
            })}
          </g>
        </svg>
      )}
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] uppercase tracking-wide text-ink-500">{label}</span>
      <span className="font-mono text-xs tabular-nums text-ink-200">{value}</span>
    </div>
  );
}

export function RLViz({ events, currentStep }: RLVizProps) {
  const snap = useMemo(() => snapshot(events, currentStep), [events, currentStep]);
  const ready = snap.rows > 0 && snap.values !== null;

  return (
    <div className="grid h-full grid-rows-[auto,3fr,1fr] gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-ink-700/50 bg-ink-900/50 px-3 py-2">
        <span className="text-xs font-medium text-ink-300">{snap.label}</span>
        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1">
          {snap.episode !== null && <StatChip label="Episode" value={snap.episode.toString()} />}
          {snap.reward !== null && (
            <StatChip label="Reward" value={(snap.reward >= 0 ? '+' : '') + formatNumber(snap.reward, 2)} />
          )}
          {snap.steps !== null && <StatChip label="Steps" value={snap.steps.toString()} />}
          {snap.epsilon !== null && <StatChip label="ε" value={formatNumber(snap.epsilon, 2)} />}
        </div>
      </div>

      <div className="min-h-0 rounded-lg border border-ink-700/50 bg-ink-900/50 p-2">
        {ready ? (
          <GridBoard snap={snap} />
        ) : (
          <div className="grid h-full place-items-center text-xs text-ink-400">
            Run to let the agent explore the grid.
          </div>
        )}
      </div>

      <div className="min-h-0 rounded-lg border border-ink-700/50 bg-ink-900/50 p-2">
        {snap.rewardHistory.length > 0 ? (
          <LossChart
            history={snap.rewardHistory}
            currentIteration={snap.currentIteration}
            label="Reward"
            yAxisLabel="Reward"
          />
        ) : (
          <div className="grid h-full place-items-center text-xs text-ink-400">
            Reward per episode appears here.
          </div>
        )}
      </div>
    </div>
  );
}
