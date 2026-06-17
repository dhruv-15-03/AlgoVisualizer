import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TopNav } from '@/components/workspace/TopNav';
import { CodePanel } from '@/components/workspace/CodePanel';
import { VizPanel } from '@/components/workspace/VizPanel';
import { RightPanel } from '@/components/workspace/RightPanel';
import { WorkspaceTabBar } from '@/components/workspace/WorkspaceTabBar';
import { LiveAnnouncer } from '@/components/workspace/LiveAnnouncer';
import type { WorkspacePane } from '@/components/workspace/workspace-pane';
import { useIsXlUp } from '@/lib/use-media-query';
import { usePlaybackKeyboard } from '@/hooks/usePlaybackKeyboard';
import { useSessionStore } from '@/stores/session-store';
import { useFamilyTheme } from '@/hooks/useFamilyTheme';
import { getAlgorithm, listAlgorithms } from '@/algorithms/registry';
import { getAlgorithmSource } from '@/algorithms/algorithm-sources';
import { getDataset } from '@/datasets/registry';
import { DEFAULT_DATASET_BY_ALGO } from '@/algorithms/default-datasets';
import { decodeShareState, readTokenFromHash } from '@/lib/share-link';
import type { AlgorithmId } from '@/types/algorithm';

export function WorkspacePage() {
  const navigate = useNavigate();
  const { algoId } = useParams<{ algoId?: AlgorithmId }>();
  const setAlgorithm = useSessionStore((s) => s.setAlgorithm);
  const setDataset = useSessionStore((s) => s.setDataset);
  const applyShareState = useSessionStore((s) => s.applyShareState);
  const currentAlgoId = useSessionStore((s) => s.algorithmId);
  const currentDatasetId = useSessionStore((s) => s.datasetId);
  const hydratedRef = useRef(false);

  // If no algoId in route, redirect to the first algorithm.
  useEffect(() => {
    if (!algoId) {
      const first = listAlgorithms()[0];
      navigate(`/workspace/${first.id}`, { replace: true });
    }
  }, [algoId, navigate]);

  // One-time hydration from a share link (`#s=…`). Runs before the default
  // algorithm/dataset effects below so it wins the initial mount.
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const token = readTokenFromHash(window.location.hash);
    if (!token) return;
    const shared = decodeShareState(token);
    if (!shared) return;
    applyShareState(shared);
    // Strip the token so a refresh won't re-hydrate and the URL stays short.
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    if (shared.algorithmId !== algoId) {
      navigate(`/workspace/${shared.algorithmId}`, { replace: true });
    }
  }, [algoId, applyShareState, navigate]);

  // When the route's algoId changes, load that algorithm into the store.
  useEffect(() => {
    if (!algoId) return;
    const meta = getAlgorithm(algoId);
    if (!meta) {
      navigate('/workspace', { replace: true });
      return;
    }
    // Read live state too: during the same mount commit as hydration the
    // closed-over `currentAlgoId` is stale (still null), which would otherwise
    // clobber a just-hydrated session back to defaults.
    const liveAlgoId = currentAlgoId ?? useSessionStore.getState().algorithmId;
    if (liveAlgoId !== algoId) {
      setAlgorithm(algoId, {
        code: getAlgorithmSource(meta.pythonFilename),
        hyperparams: meta.hyperparams,
      });
    }
  }, [algoId, currentAlgoId, setAlgorithm, navigate]);

  // Default the dataset to one that's appropriate for the algorithm.
  useEffect(() => {
    if (!algoId) return;
    const meta = getAlgorithm(algoId);
    if (!meta) return;
    const dsId = currentDatasetId ?? useSessionStore.getState().datasetId;
    const ds = dsId ? getDataset(dsId) : null;
    const compatible = ds && meta.compatibleTasks.includes(ds.task);
    if (!compatible) {
      setDataset(DEFAULT_DATASET_BY_ALGO[algoId] ?? 'iris');
    }
  }, [algoId, currentDatasetId, setDataset]);

  // Give each algorithm tab a distinct document title so multiple open
  // workspaces are distinguishable; restore the default on unmount. Also keep
  // the meta description + canonical in sync for crawlers that execute JS.
  useEffect(() => {
    const defaultTitle = 'AlgoVisualizer · ML algorithms, demystified';
    const defaultDesc =
      'AlgoVisualizer — edit real Python ML code and watch 25 algorithms train step by step on real datasets, right in your browser. No install, no setup.';
    const origin = 'https://algo-visualizer-beige.vercel.app';
    if (!algoId) return;
    const meta = getAlgorithm(algoId);
    if (!meta) return;

    document.title = `${meta.name} · AlgoVisualizer`;
    const desc = `${meta.name}: ${meta.shortDescription} Edit the Python and watch it train step by step in your browser.`;
    setMetaDescription(desc);
    setCanonical(`${origin}/workspace/${algoId}`);

    return () => {
      document.title = defaultTitle;
      setMetaDescription(defaultDesc);
      setCanonical(`${origin}/`);
    };
  }, [algoId]);

  // Keyboard transport (Space/←/→/Home/End/R) scoped to the workspace. Reads
  // and dispatches the same session-store playback actions as the buttons.
  usePlaybackKeyboard();

  const familyTheme = useFamilyTheme();

  return (
    <div className="flex h-full min-h-0 flex-col bg-ink-900" style={familyTheme.style}>
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-accent-500 px-3 py-2 text-sm font-medium text-white focus:not-sr-only focus:absolute focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <h1 className="sr-only">AlgoVisualizer — interactive machine-learning workspace</h1>
      <TopNav />
      <main id="main-content" tabIndex={-1} className="flex min-h-0 flex-1 flex-col focus:outline-none">
        <WorkspaceBody />
      </main>
      <LiveAnnouncer />
    </div>
  );
}

/** Upsert the <meta name="description"> content. */
function setMetaDescription(content: string) {
  let el = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', 'description');
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/** Upsert the <link rel="canonical"> href. */
function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
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
    </>
  );
}

