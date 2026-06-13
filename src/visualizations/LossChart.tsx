import { useMemo, useRef, useState, useLayoutEffect } from 'react';
import * as d3 from 'd3';
import { formatNumber } from '@/lib/utils';
import { lossChartDomains, nearestLossIndex, type LossPoint } from './loss-chart-utils';

interface LossChartProps {
  history: LossPoint[];
  currentIteration?: number | null;
  label?: string;
  yAxisLabel?: string;
}

/**
 * Loss / convergence line chart.
 *
 * Hand-rolled with D3 scales + SVG (the same pattern as every other
 * visualization in this folder) so the app ships a single charting engine and
 * doesn't pull in recharts. Visuals — blue monotone line, dashed grid, yellow
 * cursor dot, hover tooltip — mirror the previous recharts implementation.
 */
export function LossChart({ history, currentIteration, label = 'Loss', yAxisLabel }: LossChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

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

  const data = useMemo(() => history, [history]);

  const padding = { top: 8, right: 12, bottom: 28, left: 48 };
  const innerW = Math.max(1, size.w - padding.left - padding.right);
  const innerH = Math.max(1, size.h - padding.top - padding.bottom);

  const domains = useMemo(() => lossChartDomains(data), [data]);

  const xScale = useMemo(
    () => d3.scaleLinear().domain(domains.x).range([0, innerW]),
    [domains.x, innerW],
  );
  const yScale = useMemo(
    () => d3.scaleLinear().domain(domains.y).range([innerH, 0]),
    [domains.y, innerH],
  );

  const xTicks = useMemo(() => {
    const span = domains.x[1] - domains.x[0];
    const count = Math.min(6, Math.max(2, Math.round(span)));
    return xScale.ticks(count).filter((t) => Number.isInteger(t));
  }, [xScale, domains.x]);
  const yTicks = useMemo(() => yScale.ticks(5), [yScale]);

  const linePath = useMemo(() => {
    if (data.length === 0) return '';
    const gen = d3
      .line<LossPoint>()
      .x((d) => xScale(d.iteration))
      .y((d) => yScale(d.loss))
      .curve(d3.curveMonotoneX);
    return gen(data) ?? '';
  }, [data, xScale, yScale]);

  const cursor =
    currentIteration ?? (data.length > 0 ? data[data.length - 1].iteration : null);
  const cursorPoint =
    cursor === null ? null : (data.find((d) => d.iteration === cursor) ?? null);

  const hoverPoint = hoverIndex !== null ? (data[hoverIndex] ?? null) : null;

  function handleMove(e: React.MouseEvent<SVGRectElement>) {
    if (data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const iteration = xScale.invert(x);
    setHoverIndex(nearestLossIndex(data, iteration));
  }

  return (
    <div ref={containerRef} className="h-full w-full">
      {size.w > 0 && size.h > 0 && data.length > 0 && (
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

            {/* axes */}
            <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke="#475569" />
            <line x1={0} y1={0} x2={0} y2={innerH} stroke="#475569" />

            {/* tick labels */}
            {xTicks.map((t) => (
              <text
                key={`tx${t}`}
                x={xScale(t)}
                y={innerH + 16}
                textAnchor="middle"
                fill="#64748b"
                fontSize={10}
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
              >
                {formatNumber(t, 2)}
              </text>
            ))}

            {/* axis labels */}
            <text x={innerW / 2} y={innerH + 27} textAnchor="middle" fill="#64748b" fontSize={10}>
              Iteration
            </text>
            {yAxisLabel && (
              <text
                transform={`translate(${-padding.left + 12},${innerH / 2}) rotate(-90)`}
                textAnchor="middle"
                fill="#64748b"
                fontSize={10}
              >
                {yAxisLabel}
              </text>
            )}

            {/* loss line */}
            <path d={linePath} fill="none" stroke="#60a5fa" strokeWidth={2} />

            {/* hover guide + tooltip */}
            {hoverPoint && (
              <g pointerEvents="none">
                <line
                  x1={xScale(hoverPoint.iteration)}
                  x2={xScale(hoverPoint.iteration)}
                  y1={0}
                  y2={innerH}
                  stroke="#334155"
                  strokeDasharray="3 3"
                />
                <circle
                  cx={xScale(hoverPoint.iteration)}
                  cy={yScale(hoverPoint.loss)}
                  r={3.5}
                  fill="#60a5fa"
                  stroke="#0f172a"
                  strokeWidth={1.5}
                />
                <TooltipBox
                  x={xScale(hoverPoint.iteration)}
                  y={yScale(hoverPoint.loss)}
                  innerW={innerW}
                  label={label}
                  iteration={hoverPoint.iteration}
                  loss={hoverPoint.loss}
                />
              </g>
            )}

            {/* current-step cursor dot */}
            {cursorPoint && (
              <circle
                cx={xScale(cursorPoint.iteration)}
                cy={yScale(cursorPoint.loss)}
                r={5}
                fill="#fbbf24"
                stroke="#0f172a"
                strokeWidth={2}
              />
            )}

            {/* transparent hover capture layer */}
            <rect
              x={0}
              y={0}
              width={innerW}
              height={innerH}
              fill="transparent"
              onMouseMove={handleMove}
              onMouseLeave={() => setHoverIndex(null)}
            />
          </g>
        </svg>
      )}
    </div>
  );
}

function TooltipBox({
  x,
  y,
  innerW,
  label,
  iteration,
  loss,
}: {
  x: number;
  y: number;
  innerW: number;
  label: string;
  iteration: number;
  loss: number;
}) {
  const boxW = 132;
  const boxH = 38;
  // Flip the box to the left of the cursor when it would overflow the right edge.
  const left = x + 10 + boxW > innerW ? x - 10 - boxW : x + 10;
  const top = Math.max(0, y - boxH - 6);
  return (
    <g transform={`translate(${left},${top})`}>
      <rect width={boxW} height={boxH} rx={6} fill="#0f172a" stroke="#334155" />
      <text x={8} y={15} fill="#94a3b8" fontSize={10}>
        Iteration {iteration}
      </text>
      <text x={8} y={30} fill="#e2e8f0" fontSize={11} fontWeight={600}>
        {label}: {formatNumber(loss, 4)}
      </text>
    </g>
  );
}
