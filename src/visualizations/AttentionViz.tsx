/**
 * AttentionViz — heatmap of the current attention matrix (raw scores, scaled
 * scores, softmax weights, or final weights). Rows are queries, columns are
 * keys; hovering a row highlights it and lists the tokens it attends to most.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { AttentionSnapshot } from './attention-snapshot';

interface AttentionVizProps {
  snapshot: AttentionSnapshot;
}

const CELL_MIN = 28;
const CELL_MAX = 64;

export function AttentionViz({ snapshot }: AttentionVizProps) {
  const { tokens, matrix, stage } = snapshot;
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hoverRow, setHoverRow] = useState<number | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  // Callback ref instead of useRef + useLayoutEffect([]): the ref'd <div> only
  // exists once `matrix` is populated (see the early-return below), so a
  // mount-only effect would miss it if data arrives after first paint. A
  // callback ref re-attaches the observer every time the node changes,
  // including from null -> element once the async Pyodide run completes.
  const containerRef = useCallback((el: HTMLDivElement | null) => {
    roRef.current?.disconnect();
    roRef.current = null;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    roRef.current = ro;
  }, []);

  const n = tokens.length;
  const padding = { top: 30, right: 14, bottom: 14, left: 84 };
  const available = Math.min(size.w - padding.left - padding.right, size.h - padding.top - padding.bottom);
  const cell = n > 0 ? Math.max(CELL_MIN, Math.min(CELL_MAX, available / n)) : CELL_MIN;
  const gridSize = cell * n;

  const colorScale = useMemo(() => {
    if (!matrix) return null;
    const flat = matrix.flat();
    const isProbability = stage === 'softmax' || stage === 'output';
    const domain: [number, number] = isProbability
      ? [0, Math.max(0.01, d3.max(flat) ?? 1)]
      : ([d3.min(flat) ?? 0, d3.max(flat) ?? 1] as [number, number]);
    return d3.scaleSequential(d3.interpolateViridis).domain(domain);
  }, [matrix, stage]);

  if (n === 0 || !matrix) {
    return (
      <div className="grid h-full place-items-center text-xs text-ink-400">
        Type a sentence and press Run to compute self-attention.
      </div>
    );
  }

  const topAttended = (row: number): Array<{ token: string; weight: number }> => {
    return matrix[row]
      .map((weight, col) => ({ token: tokens[col], weight }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3);
  };

  return (
    <div ref={containerRef} className="flex h-full w-full flex-col items-center justify-center gap-2 overflow-auto p-2">
      {size.w > 0 && (
        <svg width={gridSize + padding.left + padding.right} height={gridSize + padding.top + padding.bottom}>
          <g transform={`translate(${padding.left},${padding.top})`}>
            {/* Column (key) labels */}
            {tokens.map((tok, j) => (
              <text
                key={`col-${j}`}
                x={j * cell + cell / 2}
                y={-8}
                textAnchor="middle"
                fontSize={11}
                fontFamily="JetBrains Mono, monospace"
                fill={hoverRow === null ? '#94a3b8' : '#64748b'}
              >
                {tok}
              </text>
            ))}
            {/* Row (query) labels */}
            {tokens.map((tok, i) => (
              <text
                key={`row-${i}`}
                x={-8}
                y={i * cell + cell / 2 + 4}
                textAnchor="end"
                fontSize={11}
                fontFamily="JetBrains Mono, monospace"
                fill={hoverRow === i ? '#e2e8f0' : '#94a3b8'}
                fontWeight={hoverRow === i ? 700 : 400}
              >
                {tok}
              </text>
            ))}
            {/* Cells */}
            {matrix.map((row, i) =>
              row.map((v, j) => (
                <rect
                  key={`c-${i}-${j}`}
                  x={j * cell}
                  y={i * cell}
                  width={cell - 1.5}
                  height={cell - 1.5}
                  rx={2}
                  fill={colorScale ? colorScale(v) : '#334155'}
                  opacity={hoverRow === null || hoverRow === i ? 1 : 0.25}
                  onMouseEnter={() => setHoverRow(i)}
                  onMouseLeave={() => setHoverRow(null)}
                >
                  <title>
                    {tokens[i]} → {tokens[j]}: {v.toFixed(3)}
                  </title>
                </rect>
              )),
            )}
            {/* Value labels on hovered row, for readability at small n */}
            {hoverRow !== null &&
              n <= 10 &&
              matrix[hoverRow].map((v, j) => (
                <text
                  key={`val-${j}`}
                  x={j * cell + cell / 2}
                  y={hoverRow * cell + cell / 2 + 4}
                  textAnchor="middle"
                  fontSize={10}
                  fontFamily="JetBrains Mono, monospace"
                  fill="#0f172a"
                  pointerEvents="none"
                >
                  {v.toFixed(2)}
                </text>
              ))}
          </g>
        </svg>
      )}
      {hoverRow !== null && (
        <div className="w-full max-w-md rounded-md border border-ink-700 bg-ink-900/80 px-3 py-1.5 text-[11px] text-ink-300">
          <span className="font-mono font-semibold text-accent-300">{tokens[hoverRow]}</span> attends most to:{' '}
          {topAttended(hoverRow)
            .map((t) => `${t.token} (${t.weight.toFixed(2)})`)
            .join(', ')}
        </div>
      )}
    </div>
  );
}
