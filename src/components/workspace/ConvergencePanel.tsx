import { useMemo } from 'react';
import { Panel } from '@/components/ui/Panel';
import { useSessionStore, useCurrentEvent } from '@/stores/session-store';
import { LossChart } from '@/visualizations/LossChart';
import { extractConvergence } from '@/lib/convergence';

/**
 * Standardized convergence chart for the right rail. Pulls a normalized
 * per-iteration metric series out of the raw trace (loss / inertia / accuracy /
 * log-likelihood, depending on the algorithm) and renders it with the shared
 * D3 `LossChart`. Renders nothing for algorithms that don't converge
 * iteratively, so it's purely additive.
 */
export function ConvergencePanel() {
  const events = useSessionStore((s) => s.events);
  const event = useCurrentEvent();

  const series = useMemo(() => extractConvergence(events), [events]);
  if (!series) return null;

  const currentIteration =
    event && typeof event.iteration === 'number' ? event.iteration : undefined;

  return (
    <Panel title="Convergence" subtitle={`${series.label} per iteration`} className="shrink-0">
      <div className="h-44">
        <LossChart
          history={series.points}
          currentIteration={currentIteration}
          label={series.label}
          yAxisLabel={series.yAxisLabel}
        />
      </div>
    </Panel>
  );
}
