import { useMemo, useRef, useState, useLayoutEffect } from 'react';
import * as d3 from 'd3';
import { colorFor } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

interface ScatterPlotProps {
  X: number[][];
  labels?: number[] | null;
  trueLabels?: number[] | null;
  centroids?: number[][] | null;
  highlightIndices?: number[] | null;
  /** Which feature indices to project onto (default [0, 1]). */
  featureIndices?: [number, number];
  featureNames?: string[];
}

export function ScatterPlot({
  X,
  labels,
  trueLabels,
  centroids,
  highlightIndices,
  featureIndices = [0, 1],
  featureNames,
}: ScatterPlotProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const reduceMotion = usePrefersReducedMotion();
  const centroidTransition = reduceMotion ? undefined : 'transform 200ms ease';

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fx = featureIndices[0];
  const fy = featureIndices[1];

  const xs = useMemo(() => X.map((row) => row[fx] ?? 0), [X, fx]);
  const ys = useMemo(() => X.map((row) => row[fy] ?? 0), [X, fy]);

  const padding = { top: 14, right: 14, bottom: 36, left: 44 };
  const innerW = Math.max(1, size.w - padding.left - padding.right);
  const innerH = Math.max(1, size.h - padding.top - padding.bottom);

  const xScale = useMemo(() => {
    const [a, b] = d3.extent(xs) as [number, number];
    const lo = a ?? 0;
    const hi = b ?? 1;
    const pad = (hi - lo) * 0.08 || 0.5;
    return d3
      .scaleLinear()
      .domain([lo - pad, hi + pad])
      .range([0, innerW]);
  }, [xs, innerW]);

  const yScale = useMemo(() => {
    const [a, b] = d3.extent(ys) as [number, number];
    const lo = a ?? 0;
    const hi = b ?? 1;
    const pad = (hi - lo) * 0.08 || 0.5;
    return d3
      .scaleLinear()
      .domain([lo - pad, hi + pad])
      .range([innerH, 0]);
  }, [ys, innerH]);

  const xTicks = useMemo(() => xScale.ticks(5), [xScale]);
  const yTicks = useMemo(() => yScale.ticks(5), [yScale]);

  const highlighted = useMemo(() => new Set(highlightIndices ?? []), [highlightIndices]);

  return (
    <div ref={containerRef} className="h-full w-full">
      {size.w > 0 && size.h > 0 && (
        <svg width={size.w} height={size.h}>
          <g transform={`translate(${padding.left},${padding.top})`}>
            {/* gridlines */}
            {yTicks.map((t) => (
              <line
                key={`gy${t}`}
                x1={0}
                x2={innerW}
                y1={yScale(t)}
                y2={yScale(t)}
                stroke="#1e293b"
                strokeDasharray="2 4"
              />
            ))}
            {xTicks.map((t) => (
              <line
                key={`gx${t}`}
                x1={xScale(t)}
                x2={xScale(t)}
                y1={0}
                y2={innerH}
                stroke="#1e293b"
                strokeDasharray="2 4"
              />
            ))}

            {/* axes */}
            <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke="#334155" />
            <line x1={0} y1={0} x2={0} y2={innerH} stroke="#334155" />

            {xTicks.map((t) => (
              <text
                key={`tx${t}`}
                x={xScale(t)}
                y={innerH + 18}
                textAnchor="middle"
                fill="#64748b"
                fontSize={10}
                fontFamily="JetBrains Mono"
              >
                {t}
              </text>
            ))}
            {yTicks.map((t) => (
              <text
                key={`ty${t}`}
                x={-8}
                y={yScale(t) + 3}
                textAnchor="end"
                fill="#64748b"
                fontSize={10}
                fontFamily="JetBrains Mono"
              >
                {t}
              </text>
            ))}

            {/* points */}
            {X.map((row, i) => {
              const label = labels?.[i] ?? trueLabels?.[i] ?? 0;
              const isHi = highlighted.has(i);
              return (
                <circle
                  key={i}
                  cx={xScale(row[fx])}
                  cy={yScale(row[fy])}
                  r={isHi ? 5 : 3.2}
                  fill={colorFor(label)}
                  fillOpacity={labels ? 0.85 : 0.7}
                  stroke={isHi ? '#f8fafc' : '#0f172a'}
                  strokeWidth={isHi ? 1.5 : 0.5}
                />
              );
            })}

            {/* centroids */}
            {centroids?.map((c, i) => (
              <g
                key={`c${i}`}
                transform={`translate(${xScale(c[fx])},${yScale(c[fy])})`}
                style={{ transition: centroidTransition }}
              >
                <circle r={11} fill={colorFor(i)} fillOpacity={0.18} />
                <circle r={7} fill={colorFor(i)} stroke="#0f172a" strokeWidth={2} />
                <text
                  x={0}
                  y={3}
                  textAnchor="middle"
                  fill="#0f172a"
                  fontSize={9}
                  fontFamily="JetBrains Mono"
                  fontWeight="700"
                >
                  {i}
                </text>
              </g>
            ))}

            {/* axis labels */}
            {featureNames?.[fx] && (
              <text
                x={innerW / 2}
                y={innerH + 32}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize={11}
              >
                {featureNames[fx]}
              </text>
            )}
            {featureNames?.[fy] && (
              <text
                transform={`translate(-32,${innerH / 2}) rotate(-90)`}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize={11}
              >
                {featureNames[fy]}
              </text>
            )}
          </g>
        </svg>
      )}
    </div>
  );
}
