import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { explainError } from '@/lib/explain-error';

/**
 * "Explain this error" — a friendly, collapsible companion to the raw
 * traceback. Purely additive: it interprets the error string the store already
 * holds; it does not intercept or alter error propagation.
 */
export function ExplainErrorPanel({ traceback }: { traceback: string }) {
  const [open, setOpen] = useState(true);
  const [rawOpen, setRawOpen] = useState(false);
  const explained = useMemo(() => explainError(traceback), [traceback]);

  return (
    <div className="mt-3 min-w-0 rounded-md border border-rose-500/30 bg-rose-500/5 text-left">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-t-md px-3 py-2 text-left text-xs font-semibold text-rose-200 hover:bg-rose-500/10"
      >
        <Icon name="lightbulb" size={16} fill={open} />
        <span className="flex-1">Explain this error</span>
        <Icon name={open ? 'arrow_right_alt' : 'arrow_forward'} size={16} />
      </button>

      {open && (
        <div className="flex min-w-0 flex-col gap-2 px-3 pb-3">
          <div className="text-sm font-semibold text-rose-100">{explained.title}</div>
          <p className="text-xs leading-relaxed text-ink-200">{explained.plainEnglish}</p>

          {explained.suggestions.length > 0 && (
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                Try this
              </div>
              <ul className="flex list-disc flex-col gap-1 pl-4 text-xs text-ink-200">
                {explained.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <button
              onClick={() => setRawOpen((v) => !v)}
              aria-expanded={rawOpen}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-400 hover:text-ink-200"
            >
              <Icon name="code" size={14} />
              {rawOpen ? 'Hide' : 'Show'} raw traceback
            </button>
            {rawOpen && (
              <pre className="mt-1 max-h-40 w-full overflow-auto whitespace-pre-wrap break-words rounded-md bg-ink-900/80 p-2 text-[11px] text-rose-200">
                {explained.raw || 'No traceback available.'}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
