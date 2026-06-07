import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TopNav } from '@/components/workspace/TopNav';
import { CodePanel } from '@/components/workspace/CodePanel';
import { VizPanel } from '@/components/workspace/VizPanel';
import { RightPanel } from '@/components/workspace/RightPanel';
import { WorkspaceTabBar } from '@/components/workspace/WorkspaceTabBar';
import { MobilePlaybackBar } from '@/components/workspace/MobilePlaybackBar';
import type { WorkspacePane } from '@/components/workspace/workspace-pane';
import { useIsXlUp } from '@/lib/use-media-query';
import { useSessionStore } from '@/stores/session-store';
import { getAlgorithm, listAlgorithms } from '@/algorithms/registry';
import { getDataset } from '@/datasets/registry';
import type { AlgorithmId } from '@/types/algorithm';

const DEFAULT_DATASET_BY_ALGO: Record<AlgorithmId, string> = {
  kmeans: 'blobs',
  linreg: 'linear',
  logreg: 'moons',
  dtree: 'iris',
  knn: 'moons',
  naivebayes: 'iris',
  svm: 'moons',
  randomforest: 'spirals',
  mlp: 'spirals',
  cnn: 'shapes',
  polyreg: 'polywave',
  ridge: 'noisy-linear',
  lasso: 'noisy-linear',
  dbscan: 'moons',
  hierarchical: 'blobs',
  gmm: 'gmm-mix',
  pca: 'wine',
  tsne: 'iris',
};

export function WorkspacePage() {
  const navigate = useNavigate();
  const { algoId } = useParams<{ algoId?: AlgorithmId }>();
  const setAlgorithm = useSessionStore((s) => s.setAlgorithm);
  const setDataset = useSessionStore((s) => s.setDataset);
  const currentAlgoId = useSessionStore((s) => s.algorithmId);
  const currentDatasetId = useSessionStore((s) => s.datasetId);

  // If no algoId in route, redirect to the first algorithm.
  useEffect(() => {
    if (!algoId) {
      const first = listAlgorithms()[0];
      navigate(`/workspace/${first.id}`, { replace: true });
    }
  }, [algoId, navigate]);

  // When the route's algoId changes, load that algorithm into the store.
  useEffect(() => {
    if (!algoId) return;
    const meta = getAlgorithm(algoId);
    if (!meta) {
      navigate('/workspace', { replace: true });
      return;
    }
    if (currentAlgoId !== algoId) {
      setAlgorithm(algoId, { code: meta.defaultCode, hyperparams: meta.hyperparams });
    }
  }, [algoId, currentAlgoId, setAlgorithm, navigate]);

  // Default the dataset to one that's appropriate for the algorithm.
  useEffect(() => {
    if (!algoId) return;
    const meta = getAlgorithm(algoId);
    if (!meta) return;
    const ds = currentDatasetId ? getDataset(currentDatasetId) : null;
    const compatible = ds && meta.compatibleTasks.includes(ds.task);
    if (!compatible) {
      setDataset(DEFAULT_DATASET_BY_ALGO[algoId] ?? 'iris');
    }
  }, [algoId, currentDatasetId, setDataset]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-ink-900">
      <TopNav />
      <WorkspaceBody />
    </div>
  );
}

/**
 * Responsive workspace shell.
 *   - `xl+` (≥1280px): three-pane grid — Code | Viz | Right.
 *   - `<xl`: tabbed single-pane UX with sticky bottom playback bar.
 *
 * Tabs use conditional rendering: switching to Code lazily mounts Monaco
 * (~500KB chunk) on first use; switching away unmounts it. The Pyodide
 * runtime and code state live in the global store so nothing is lost.
 */
function WorkspaceBody() {
  const isDesktop = useIsXlUp();
  const [pane, setPane] = useState<WorkspacePane>('viz');

  if (isDesktop) {
    return (
      <div className="grid min-h-0 flex-1 grid-cols-12 grid-rows-1 gap-3 p-3">
        <div className="col-span-3 flex min-h-0 min-w-0 flex-col">
          <CodePanel />
        </div>
        <div className="col-span-6 flex min-h-0 min-w-0 flex-col">
          <VizPanel />
        </div>
        <div className="col-span-3 min-h-0 min-w-0">
          <RightPanel />
        </div>
      </div>
    );
  }

  return (
    <>
      <WorkspaceTabBar value={pane} onChange={setPane} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col p-2 sm:p-3">
        {pane === 'viz' && <VizPanel />}
        {pane === 'code' && (
          <div className="flex min-h-0 flex-1 flex-col">
            <CodePanel />
          </div>
        )}
        {pane === 'tune' && <RightPanel />}
      </div>
      <MobilePlaybackBar />
    </>
  );
}

