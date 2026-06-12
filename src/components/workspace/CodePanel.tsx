import { useMemo } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Icon } from '@/components/ui/Icon';
import { CodeEditor } from '@/components/CodeEditor';
import { useSessionStore } from '@/stores/session-store';
import { getAlgorithm } from '@/algorithms/registry';
import { findLine, extractValue } from '@/lib/code-binding';

export function CodePanel() {
  const algorithmId = useSessionStore((s) => s.algorithmId);
  const code = useSessionStore((s) => s.code);
  const setCode = useSessionStore((s) => s.setCode);
  const setHyperparam = useSessionStore((s) => s.setHyperparam);
  const hyperparams = useSessionStore((s) => s.hyperparams);

  const algorithm = algorithmId ? getAlgorithm(algorithmId) : null;

  // Highlight the first hyperparam line (best-effort).
  const firstHpCodeKey = algorithm?.hyperparams[0]?.codeKey;
  const highlightedLine = useMemo(
    () => (firstHpCodeKey ? findLine(code, firstHpCodeKey) : null),
    [code, firstHpCodeKey],
  );

  // Wire up code → hyperparam sync. When the user edits the Python source,
  // re-extract each hyperparam from the new code; if a value changed, push it
  // into the store so the sliders, metrics, and run all reflect the edit.
  const handleChange = (newCode: string) => {
    setCode(newCode);
    if (!algorithm) return;
    for (const p of algorithm.hyperparams) {
      const extracted = extractValue(newCode, p.codeKey);
      if (extracted === null) continue;
      if (extracted === hyperparams[p.id]) continue;
      // Pass the raw typed value through unchanged. Clamping here would
      // silently rewrite what the user typed (and what gets sent to the
      // worker); the range input simply pins its thumb at the boundary.
      setHyperparam(p.id, extracted);
    }
  };

  if (!algorithm) {
    return (
      <Panel title="Code">
        <div className="grid h-full place-items-center text-sm text-ink-400">No algorithm selected.</div>
      </Panel>
    );
  }

  const titleNode = (
    <span className="inline-flex items-center gap-1.5">
      <Icon name="data_object" size={14} className="text-accent-400" />
      <span className="truncate">{algorithm.pythonFilename}</span>
    </span>
  );

  return (
    <Panel
      className="h-full"
      title={titleNode}
      subtitle="Editable Python — runs in your browser via Pyodide"
      right={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          Live
        </span>
      }
      noBody
    >
      <div className="min-h-0 flex-1">
        <CodeEditor value={code} onChange={handleChange} highlightedLine={highlightedLine ?? undefined} />
      </div>
    </Panel>
  );
}
