import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Home } from '@/pages/Home';
import { attachController } from '@/controllers/training-controller';
import { ConsentBanner } from '@/components/ConsentBanner';
import { UpdatePrompt } from '@/components/UpdatePrompt';
import { maybeLoadClarity } from '@/lib/consent';
import { installGlobalErrorReporting } from '@/lib/error-reporting';

// Route-level code splitting. Home stays eager (it's the entry point);
// WorkspacePage and RacePage are pulled lazily so the initial bundle
// doesn't ship Monaco, the Pyodide worker, KaTeX, or the heavy viz deps.
const WorkspacePage = lazy(() =>
  import('@/pages/WorkspacePage').then((m) => ({ default: m.WorkspacePage })),
);
const RacePage = lazy(() =>
  import('@/pages/RacePage').then((m) => ({ default: m.RacePage })),
);
const LearnPage = lazy(() =>
  import('@/pages/LearnPage').then((m) => ({ default: m.LearnPage })),
);
const AttentionPage = lazy(() =>
  import('@/pages/AttentionPage').then((m) => ({ default: m.AttentionPage })),
);

function RouteSplash() {
  return (
    <div className="grid h-full place-items-center bg-ink-900 text-ink-300">
      <div className="flex flex-col items-center gap-3">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full border-2 border-ink-700" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-accent-400" />
        </div>
        <div className="text-xs uppercase tracking-wider text-ink-400">Loading…</div>
      </div>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    const detach = attachController();
    return detach;
  }, []);

  // Re-load Clarity on return visits where the user previously accepted.
  // (First-time/declined visitors load nothing.)
  useEffect(() => {
    maybeLoadClarity();
  }, []);

  // Route uncaught errors / promise rejections into consent-gated reporting.
  useEffect(() => installGlobalErrorReporting(), []);

  return (
    <>
      <Suspense fallback={<RouteSplash />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/workspace" element={<WorkspacePage />} />
          <Route path="/workspace/:algoId" element={<WorkspacePage />} />
          <Route path="/race" element={<RacePage />} />
          <Route path="/attention" element={<AttentionPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <ConsentBanner />
      <UpdatePrompt />
    </>
  );
}
