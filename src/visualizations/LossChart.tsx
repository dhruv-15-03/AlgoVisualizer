import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import { useMemo } from 'react';

interface LossChartProps {
  history: Array<{ iteration: number; loss: number }>;
  currentIteration?: number | null;
  label?: string;
  yAxisLabel?: string;
}

export function LossChart({ history, currentIteration, label = 'Loss', yAxisLabel }: LossChartProps) {
  const data = useMemo(() => history, [history]);
  const cursor = currentIteration ?? (history.length > 0 ? history[history.length - 1].iteration : null);
  const cursorPoint = data.find((d) => d.iteration === cursor) ?? null;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 24, left: 4 }}>
        <CartesianGrid stroke="#1e293b" strokeDasharray="2 4" />
        <XAxis
          dataKey="iteration"
          stroke="#475569"
          fontSize={10}
          tick={{ fill: '#64748b' }}
          label={{ value: 'Iteration', position: 'insideBottom', offset: -8, fill: '#64748b', fontSize: 10 }}
        />
        <YAxis
          stroke="#475569"
          fontSize={10}
          tick={{ fill: '#64748b' }}
          label={
            yAxisLabel
              ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }
              : undefined
          }
        />
        <Tooltip
          contentStyle={{
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: 6,
            fontSize: 12,
          }}
          labelStyle={{ color: '#94a3b8' }}
        />
        <Line
          type="monotone"
          dataKey="loss"
          name={label}
          stroke="#60a5fa"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        {cursorPoint && (
          <ReferenceDot
            x={cursorPoint.iteration}
            y={cursorPoint.loss}
            r={5}
            fill="#fbbf24"
            stroke="#0f172a"
            strokeWidth={2}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
