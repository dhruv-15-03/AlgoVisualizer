import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { exportSvgElementAsPng } from '@/lib/export-image';

type Feedback = { tone: 'ok' | 'error'; message: string } | null;

interface ExportPngButtonProps {
  /** Container whose first <svg> child is exported. */
  targetRef: React.RefObject<HTMLElement>;
  /** Base name for the downloaded file. */
  fileName?: string;
}

/**
 * "Export PNG" — rasterizes the current SVG visualization to a PNG download.
 * Watches the target for an `<svg>` and disables itself (with an explanatory
 * tooltip) for canvas/image-based visualizations that can't be serialized.
 */
export function ExportPngButton({ targetRef, fileName }: ExportPngButtonProps) {
  const [hasSvg, setHasSvg] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const update = () => setHasSvg(Boolean(el.querySelector('svg')));
    update();
    const observer = new MutationObserver(update);
    observer.observe(el, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [targetRef]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const flash = useCallback((next: Feedback) => {
    setFeedback(next);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setFeedback(null), 2600);
  }, []);

  const onExport = useCallback(async () => {
    const svg = targetRef.current?.querySelector('svg');
    if (!svg) {
      flash({ tone: 'error', message: 'Nothing to export' });
      return;
    }
    try {
      await exportSvgElementAsPng(svg as SVGSVGElement, { fileName });
      flash({ tone: 'ok', message: 'PNG downloaded' });
    } catch {
      flash({ tone: 'error', message: 'Export failed' });
    }
  }, [targetRef, fileName, flash]);

  return (
    <span className="relative inline-flex">
      <button
        onClick={onExport}
        disabled={!hasSvg}
        title={hasSvg ? 'Export this visualization as a PNG' : 'This visualization can’t be exported as PNG'}
        aria-label={hasSvg ? 'Export visualization as PNG' : 'Export unavailable for this visualization'}
        className="touch-target inline-flex items-center justify-center gap-1 rounded-md border border-ink-600 px-1.5 py-0.5 text-[11px] font-medium text-ink-300 hover:border-accent-400 hover:text-accent-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ink-600 disabled:hover:text-ink-300"
      >
        <Icon name="download" size={14} />
        <span className="hidden sm:inline">PNG</span>
      </button>
      <span
        aria-live="polite"
        className={`pointer-events-none absolute right-0 top-full z-10 mt-1 whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-medium shadow-lg transition-opacity ${
          feedback ? 'opacity-100' : 'opacity-0'
        } ${
          feedback?.tone === 'error'
            ? 'border-rose-500/40 bg-rose-500/15 text-rose-200'
            : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
        }`}
      >
        {feedback?.message ?? ''}
      </span>
    </span>
  );
}
