import { Panel } from '@/components/ui/Panel';
import { Slider } from '@/components/ui/Slider';
import { Icon } from '@/components/ui/Icon';
import { useSessionStore, useCurrentEvent } from '@/stores/session-store';
import { getAlgorithm } from '@/algorithms/registry';
import { getDataset, listDatasets } from '@/datasets/registry';
import { patchCode } from '@/lib/code-binding';
import { formatNumber } from '@/lib/utils';
import { useState } from 'react';
import { SweepDialog } from './SweepDialog';
import { ConvergencePanel } from './ConvergencePanel';
import type { AlgorithmReference, ReferenceKind } from '@/types/algorithm';

const KIND_ICON: Record<ReferenceKind, string> = {
  wiki: 'menu_book',
  sklearn: 'science',
  paper: 'description',
  video: 'play_circle',
  article: 'article',
};

const KIND_LABEL: Record<ReferenceKind, string> = {
  wiki: 'Wikipedia',
  sklearn: 'scikit-learn',
  paper: 'Paper',
  video: 'Video',
  article: 'Article',
};

function ReferencesList({ references }: { references: AlgorithmReference[] }) {
  if (references.length === 0) {
    return <div className="text-xs text-ink-500">No external references yet.</div>;
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[10px] uppercase tracking-wide text-ink-500">
        Curated reading & video material. Opens in a new tab.
      </div>
      {references.map((r) => (
        <a
          key={r.url}
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-2.5 rounded-md border border-ink-700 bg-ink-900 px-2.5 py-2 transition-colors hover:border-accent-500/50 hover:bg-ink-800"
        >
          <Icon name={KIND_ICON[r.kind]} size={18} className="mt-0.5 text-ink-400 group-hover:text-accent-300" />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wide text-ink-500">{KIND_LABEL[r.kind]}</div>
            <div className="truncate text-xs text-ink-200 group-hover:text-accent-200">{r.label}</div>
            <div className="truncate font-mono text-[10px] text-ink-500">{r.url.replace(/^https?:\/\//, '')}</div>
          </div>
          <Icon
            name="open_in_new"
            size={14}
            className="mt-0.5 text-ink-500 group-hover:text-accent-300"
          />
        </a>
      ))}
    </div>
  );
}

function Hyperparams() {
  const algorithmId = useSessionStore((s) => s.algorithmId);
  const hyperparams = useSessionStore((s) => s.hyperparams);
  const setHyperparam = useSessionStore((s) => s.setHyperparam);
  const code = useSessionStore((s) => s.code);
  const setCode = useSessionStore((s) => s.setCode);
  const [sweepingId, setSweepingId] = useState<string | null>(null);
  const algorithm = algorithmId ? getAlgorithm(algorithmId) : null;
  if (!algorithm) return null;
  return (
    <Panel
      title="Hyperparameters"
      className="shrink-0"
      subtitle={
        <span className="inline-flex flex-wrap items-center gap-1">
          Sliders edit the code.
          <Icon name="query_stats" size={12} className="text-ink-400" />
          sweeps the value across a range.
        </span>
      }
    >
      <div className="flex flex-col gap-3">
        {algorithm.hyperparams.map((p) => {
          if (p.type === 'enum') {
            const raw = hyperparams[p.id];
            const value = typeof raw === 'string' ? raw : (p.default as string);
            const options = p.options ?? [];
            return (
              <div key={p.id}>
                <div className="mb-1 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-ink-200">{p.label}</div>
                    <div className="font-mono text-[10px] text-ink-500">{p.codeKey}&quot;{value}&quot;</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  {options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setHyperparam(p.id, opt);
                        setCode(patchCode(code, p.codeKey, opt));
                      }}
                      className={`flex-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                        opt === value
                          ? 'border-accent-400 bg-accent-500/15 text-accent-200'
                          : 'border-ink-600 bg-ink-800 text-ink-300 hover:border-ink-500'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {p.description && <div className="mt-1 text-[11px] leading-snug text-ink-500">{p.description}</div>}
              </div>
            );
          }
          const raw = hyperparams[p.id];
          const value = typeof raw === 'number' ? raw : (p.default as number);
          const fmt = p.type === 'int' ? value.toFixed(0) : value.toFixed(3);
          return (
            <div key={p.id}>
              <div className="mb-1 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-ink-200">{p.label}</div>
                  <div className="font-mono text-[10px] text-ink-500">{p.codeKey}{fmt}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-accent-300">{fmt}</span>
                  <button
                    type="button"
                    title={`Sweep ${p.label} across a range`}
                    aria-label={`Sweep ${p.label}`}
                    onClick={() => setSweepingId(p.id)}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-ink-600 text-ink-400 transition-colors hover:border-accent-400 hover:text-accent-200"
                  >
                    <Icon name="query_stats" size={14} />
                  </button>
                </div>
              </div>
              <Slider
                value={value}
                min={p.min ?? 0}
                max={p.max ?? 1}
                step={p.step ?? 0.01}
                aria-label={p.label}
                onValueChange={(v) => {
                  setHyperparam(p.id, v);
                  setCode(patchCode(code, p.codeKey, p.type === 'int' ? Math.round(v) : v));
                }}
              />
              {p.description && <div className="mt-1 text-[11px] leading-snug text-ink-500">{p.description}</div>}
            </div>
          );
        })}
      </div>
      {sweepingId && <SweepDialog hyperparamId={sweepingId} onClose={() => setSweepingId(null)} />}
    </Panel>
  );
}

function Metrics() {
  const events = useSessionStore((s) => s.events);
  const algorithmId = useSessionStore((s) => s.algorithmId);
  const event = useCurrentEvent();
  if (!algorithmId || events.length === 0) {
    return (
      <Panel title="Metrics" className="shrink-0">
        <div className="text-xs text-ink-500">Run the algorithm to see metrics.</div>
      </Panel>
    );
  }
  const metrics: Array<{ label: string; value: string }> = [];
  metrics.push({ label: 'Events', value: events.length.toString() });

  if (event) {
    if ('inertia' in event && typeof event.inertia === 'number') {
      metrics.push({ label: 'Inertia', value: formatNumber(event.inertia) });
    }
    if ('loss' in event && typeof event.loss === 'number') {
      metrics.push({ label: 'Loss', value: formatNumber(event.loss, 4) });
    }
    if ('accuracy' in event && typeof event.accuracy === 'number') {
      metrics.push({ label: 'Accuracy', value: `${(event.accuracy * 100).toFixed(1)}%` });
    }
    if ('iteration' in event && typeof event.iteration === 'number') {
      metrics.push({ label: 'Iteration', value: event.iteration.toString() });
    }
    if ('reward' in event && typeof event.reward === 'number') {
      metrics.push({ label: 'Reward', value: formatNumber(event.reward, 3) });
    }
    if ('steps' in event && typeof event.steps === 'number') {
      metrics.push({ label: 'Steps', value: event.steps.toString() });
    }
    if ('epsilon' in event && typeof event.epsilon === 'number') {
      metrics.push({ label: 'Epsilon', value: formatNumber(event.epsilon, 3) });
    }
    if ('moved' in event && typeof event.moved === 'number') {
      metrics.push({ label: 'Centroid Δ', value: formatNumber(event.moved, 4) });
    }
    if ('totalNodes' in event && typeof event.totalNodes === 'number') {
      metrics.push({ label: 'Nodes', value: event.totalNodes.toString() });
    }
    if ('totalLeaves' in event && typeof event.totalLeaves === 'number') {
      metrics.push({ label: 'Leaves', value: event.totalLeaves.toString() });
    }
    if ('maxDepthReached' in event && typeof event.maxDepthReached === 'number') {
      metrics.push({ label: 'Depth', value: event.maxDepthReached.toString() });
    }
  }

  return (
    <Panel title="Metrics" subtitle="Reflect the current step" className="shrink-0">
      <div className="grid grid-cols-2 gap-2">
        {metrics.map((m) => (
          <div key={m.label} className="metric">
            <div className="metric-label">{m.label}</div>
            <div className="metric-value">{m.value}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function AlgorithmInfo() {
  const algorithmId = useSessionStore((s) => s.algorithmId);
  const algorithm = algorithmId ? getAlgorithm(algorithmId) : null;
  const [tab, setTab] = useState<'about' | 'learn' | 'sklearn'>('about');
  if (!algorithm) return null;
  const refs = algorithm.references ?? [];
  return (
    <Panel
      title={algorithm.name}
      subtitle={algorithm.shortDescription}
      className="shrink-0"
      right={
        <div className="flex overflow-hidden rounded-md border border-ink-600">
          {(['about', 'learn', 'sklearn'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              aria-pressed={tab === k}
              className={`px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors sm:px-2 ${
                tab === k ? 'bg-ink-700 text-ink-100' : 'text-ink-400 hover:text-ink-200'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      }
    >
      {tab === 'about' ? (
        <div className="flex flex-col gap-2 text-xs text-ink-300">
          <p className="leading-relaxed">{algorithm.longDescription}</p>
          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
            <div className="metric">
              <div className="metric-label">Time</div>
              <div className="font-mono text-xs text-ink-100">{algorithm.timeComplexity}</div>
            </div>
            <div className="metric">
              <div className="metric-label">Space</div>
              <div className="font-mono text-xs text-ink-100">{algorithm.spaceComplexity}</div>
            </div>
          </div>
          <div className="pt-1">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300">Strengths</div>
            <ul className="mt-1 ml-4 list-disc space-y-0.5">
              {algorithm.pros.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-rose-300">Trade-offs</div>
            <ul className="mt-1 ml-4 list-disc space-y-0.5">
              {algorithm.cons.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : tab === 'learn' ? (
        <ReferencesList references={refs} />
      ) : (
        <pre className="overflow-x-auto rounded-md bg-ink-900 p-3 font-mono text-[11px] leading-relaxed text-ink-200">
          {algorithm.sklearnSnippet}
        </pre>
      )}
    </Panel>
  );
}

function DatasetInfo() {
  const datasetId = useSessionStore((s) => s.datasetId);
  const dataset = datasetId ? getDataset(datasetId) : null;
  const allDatasets = listDatasets();
  const info = allDatasets.find((d) => d.id === datasetId) ?? null;
  if (!dataset || !info) return null;
  return (
    <Panel title="Dataset" subtitle={dataset.description} className="shrink-0">
      <div className="grid grid-cols-3 gap-2">
        <div className="metric">
          <div className="metric-label">{info.task === 'reinforcement' ? 'Rows' : 'Samples'}</div>
          <div className="metric-value">{info.samples}</div>
        </div>
        <div className="metric">
          <div className="metric-label">{info.task === 'reinforcement' ? 'Cols' : 'Features'}</div>
          <div className="metric-value">{info.features}</div>
        </div>
        <div className="metric">
          <div className="metric-label">
            {info.task === 'reinforcement' ? 'Env' : info.task === 'regression' ? 'Task' : 'Classes'}
          </div>
          <div className="metric-value">
            {info.task === 'reinforcement' ? 'grid' : info.task === 'regression' ? 'reg.' : info.classes ?? '—'}
          </div>
        </div>
      </div>
      <div className="mt-2 text-[10px] text-ink-500">{info.source}</div>
    </Panel>
  );
}

export function RightPanel() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-1">
      <Hyperparams />
      <Metrics />
      <ConvergencePanel />
      <AlgorithmInfo />
      <DatasetInfo />
    </div>
  );
}
