import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listAlgorithms, listAlgorithmsByCategory } from '@/algorithms/registry';
import { listDatasets } from '@/datasets/catalog';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { CATEGORY_LABELS } from '@/types/algorithm';
import { prewarmPyodide } from '@/controllers/training-controller';

export function Home() {
  const firstAlgorithm = listAlgorithms()[0];
  const groups = listAlgorithmsByCategory().filter((g) => g.algorithms.length > 0);
  const datasets = listDatasets();
  const totalAlgorithms = groups.reduce((sum, g) => sum + g.algorithms.length, 0);

  // Pre-warm two things while the visitor is reading the hero:
  //   1) The lazy-loaded Workspace bundle (Monaco + viz code) — so the
  //      route transition feels instant.
  //   2) The Pyodide worker + CPython WASM (~10 MB) — so the algorithm
  //      starts training the moment the user lands on the workspace.
  // Both run during browser idle time to avoid jank on the Home paint.
  useEffect(() => {
    const ric: (cb: () => void) => number =
      typeof window.requestIdleCallback === 'function'
        ? (cb) => window.requestIdleCallback(cb, { timeout: 2000 })
        : (cb) => window.setTimeout(cb, 600);
    const cic: (id: number) => void =
      typeof window.cancelIdleCallback === 'function'
        ? (id) => window.cancelIdleCallback(id)
        : (id) => window.clearTimeout(id);
    const handle = ric(() => {
      // Fire-and-forget; failures are intentionally swallowed by the
      // prewarm helpers (errors surface on the real run instead).
      void import('@/pages/WorkspacePage');
      void import('@/pages/RacePage');
      void import('@/pages/AttentionPage');
      prewarmPyodide();
    });
    return () => cic(handle);
  }, []);

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col overflow-y-auto px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col items-center gap-4 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent-500/15 text-accent-300">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 17l6-6 4 4 6-9" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="4" cy="17" r="2" fill="currentColor" />
            <circle cx="10" cy="11" r="2" fill="currentColor" />
            <circle cx="14" cy="15" r="2" fill="currentColor" />
            <circle cx="20" cy="6" r="2" fill="currentColor" />
          </svg>
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink-50 sm:text-4xl md:text-5xl">
          See ML algorithms <span className="text-accent-300">train, live</span>.
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-300 sm:text-base">
          Edit real Python in your browser. Watch K-Means find clusters, gradient descent climb down a loss
          surface, a decision tree split its data. No backend, no setup — just press play.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link to="/learn">
            <Button variant="primary" size="lg">
              <Icon name="menu_book" size={18} />
              Start learning
            </Button>
          </Link>
          <Link to={`/workspace/${firstAlgorithm.id}`}>
            <Button variant="secondary" size="lg">
              Open the workspace
              <Icon name="arrow_forward" size={18} />
            </Button>
          </Link>
          <Link to="/race">
            <Button variant="secondary" size="lg">
              <Icon name="flag" size={18} />
              Race mode
            </Button>
          </Link>
          <a
            href="https://pyodide.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-ink-400 hover:text-ink-200"
          >
            Powered by Pyodide
          </a>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-ink-400">
          <span>
            <span className="font-semibold text-ink-300">{totalAlgorithms}</span> algorithms
          </span>
          <span className="h-3 w-px bg-ink-700" aria-hidden />
          <span>
            <span className="font-semibold text-ink-300">{datasets.length}</span> datasets
          </span>
          <span className="h-3 w-px bg-ink-700" aria-hidden />
          <span>
            <span className="font-semibold text-ink-300">{groups.length}</span> categories
          </span>
        </div>
      </header>

      <section className="mt-8 sm:mt-12">
        <div className="flex items-baseline justify-between border-b border-ink-700 pb-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-ink-300">
            LLM / Modern AI Lab
            <span className="rounded-full bg-accent-500/15 px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-accent-300">
              New
            </span>
          </h2>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/attention"
            className="group relative rounded-xl border border-accent-500/30 bg-gradient-to-br from-ink-800 to-ink-800/60 p-4 transition-colors hover:border-accent-500/60"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-ink-100 group-hover:text-accent-300">
                Self-Attention
              </h3>
              <Icon name="science" size={16} className="text-accent-300" />
            </div>
            <p className="mt-1 text-xs leading-relaxed text-ink-400">
              Watch Q·Kᵀ, softmax, and the weighted sum of V compute a transformer's core mechanism on a
              sentence you type — with multiple attention heads and sinusoidal positional encoding running
              in parallel. Switch heads to see each one learn a different pattern, then hover a token to see
              what it attends to.
            </p>
          </Link>
        </div>
      </section>

      <section className="mt-8 space-y-8 sm:mt-12">
        {groups.map(({ category, algorithms }) => (
          <div key={category}>
            <div className="flex items-baseline justify-between border-b border-ink-700 pb-2">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-300">
                {CATEGORY_LABELS[category]}
              </h2>
              <span className="text-[11px] text-ink-400">
                {algorithms.length} {algorithms.length === 1 ? 'algorithm' : 'algorithms'}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {algorithms.map((a) => {
                const wiki = a.references?.find((r) => r.kind === 'wiki');
                return (
                  <div
                    key={a.id}
                    className="group relative rounded-xl border border-ink-700 bg-ink-800 p-4 shadow-e2 transition-all duration-150 ease-standard hover:-translate-y-0.5 hover:border-accent-500/50 hover:bg-ink-750 hover:shadow-e8"
                  >
                    <Link
                      to={`/workspace/${a.id}`}
                      aria-label={a.name}
                      className="absolute inset-0 z-0 rounded-xl"
                    >
                      <span className="sr-only">{a.name}</span>
                    </Link>
                    {wiki && (
                      <a
                        href={wiki.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute right-4 top-4 z-10 shrink-0 text-ink-400 hover:text-accent-300"
                        title="Read on Wikipedia"
                        aria-label="Read on Wikipedia"
                      >
                        <Icon name="open_in_new" size={14} />
                      </a>
                    )}
                    <div className="pointer-events-none relative z-10">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-ink-100 group-hover:text-accent-300">
                          {a.name}
                        </h3>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-ink-400">{a.shortDescription}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {a.hyperparams.slice(0, 4).map((h) => (
                          <span
                            key={h.id}
                            className="rounded-md bg-ink-900 px-1.5 py-0.5 font-mono text-[10px] text-ink-300"
                          >
                            {h.codeKey}
                            {h.default}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-400">Datasets</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {datasets.map((d) => (
            <div
              key={d.id}
              className="rounded-md border border-ink-700 bg-ink-800 px-3 py-1.5 text-xs text-ink-300"
            >
              <span className="font-semibold text-ink-100">{d.name}</span>
              <span className="ml-2 text-ink-400">
                {d.samples}×{d.features} <span className="px-1 text-ink-700">·</span> {d.task}
              </span>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-auto pt-12 text-center text-[11px] text-ink-400">
        Open source <span className="px-1 text-ink-700">·</span> MIT <span className="px-1 text-ink-700">·</span> Built with React, Vite, Pyodide &amp; Monaco
      </footer>
    </div>
  );
}
