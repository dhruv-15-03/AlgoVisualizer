import { useMemo } from 'react';
import type { TraceEvent } from '@/types/trace';
import type { Dataset } from '@/types/dataset';
import { ScatterPlot } from './ScatterPlot';
import { LossChart } from './LossChart';

interface KMeansVizProps {
  dataset: Dataset;
  events: TraceEvent[];
  currentStep: number;
}

interface KMeansSnapshot {
  centroids: number[][] | null;
  labels: number[] | null;
  history: Array<{ iteration: number; loss: number }>;
  currentIteration: number | null;
}

function snapshot(events: TraceEvent[], upTo: number): KMeansSnapshot {
  let centroids: number[][] | null = null;
  let labels: number[] | null = null;
  const history: Array<{ iteration: number; loss: number }> = [];
  let currentIteration: number | null = null;
  for (let i = 0; i <= upTo && i < events.length; i += 1) {
    const e = events[i];
    if (e.type === 'kmeans:init') {
      centroids = e.centroids;
    } else if (e.type === 'kmeans:assign') {
      labels = e.labels;
      history.push({ iteration: e.iteration ?? history.length, loss: e.inertia });
      currentIteration = e.iteration ?? null;
    } else if (e.type === 'kmeans:update') {
      centroids = e.centroids;
      currentIteration = e.iteration ?? null;
    } else if (e.type === 'kmeans:converged') {
      currentIteration = e.iteration ?? currentIteration;
    }
  }
  return { centroids, labels, history, currentIteration };
}

export function KMeansViz({ dataset, events, currentStep }: KMeansVizProps) {
  const snap = useMemo(() => snapshot(events, currentStep), [events, currentStep]);
  return (
    <div className="grid h-full grid-rows-[3fr,1fr] gap-3">
      <div className="min-h-0 rounded-lg border border-ink-700/50 bg-ink-900/50 p-2">
        <ScatterPlot
          X={dataset.X}
          labels={snap.labels}
          trueLabels={dataset.y}
          centroids={snap.centroids}
          featureNames={dataset.featureNames}
        />
      </div>
      <div className="min-h-0 rounded-lg border border-ink-700/50 bg-ink-900/50 p-2">
        <LossChart
          history={snap.history}
          currentIteration={snap.currentIteration}
          label="Inertia"
          yAxisLabel="Inertia"
        />
      </div>
    </div>
  );
}
