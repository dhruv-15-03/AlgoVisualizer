import { useCallback, useEffect, useRef, useState } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { Icon } from '@/components/ui/Icon';
import {
  buildShareUrl,
  encodeShareState,
  RECOMMENDED_MAX_SHARE_TOKEN_LENGTH,
  type WorkspaceShareState,
} from '@/lib/share-link';

type Feedback = { tone: 'ok' | 'warn' | 'error'; message: string } | null;

/**
 * "Share" button — encodes the current workspace (algorithm, edited code,
 * hyperparameters, and the active dataset, embedding it in full when it's a
 * bring-your-own dataset) into a permalink and copies it to the clipboard.
 */
export function ShareButton() {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const flash = useCallback((next: Feedback) => {
    setFeedback(next);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setFeedback(null), 2800);
  }, []);

  const onShare = useCallback(async () => {
    const { algorithmId, code, hyperparams, datasetId, customDatasets } =
      useSessionStore.getState();
    if (!algorithmId || !datasetId) {
      flash({ tone: 'warn', message: 'Nothing to share yet' });
      return;
    }

    const custom = customDatasets.find((d) => d.id === datasetId);
    const state: WorkspaceShareState = {
      algorithmId,
      code,
      hyperparams,
      datasetId,
      ...(custom ? { customDataset: custom } : {}),
    };

    const token = encodeShareState(state);
    const url = buildShareUrl(token);

    const ok = await copyToClipboard(url);
    if (!ok) {
      flash({ tone: 'error', message: 'Copy failed — link in console' });
      // Last-resort fallback so the link is never lost.
      // eslint-disable-next-line no-console
      console.info('Share link:', url);
      return;
    }
    if (token.length > RECOMMENDED_MAX_SHARE_TOKEN_LENGTH) {
      flash({ tone: 'warn', message: 'Copied (long link)' });
    } else {
      flash({ tone: 'ok', message: 'Link copied!' });
    }
  }, [flash]);

  return (
    <div className="relative">
      <button
        onClick={onShare}
        title="Copy a shareable link to this workspace"
        aria-label="Copy a shareable link to this workspace"
        className="touch-target inline-flex items-center justify-center gap-1.5 rounded-md border border-ink-600 px-2 py-1 text-xs font-medium text-ink-300 hover:border-accent-400 hover:text-accent-200"
      >
        <Icon name="share" size={16} />
        <span className="hidden md:inline">Share</span>
      </button>
      <span
        aria-live="polite"
        className={`pointer-events-none absolute right-0 top-full z-10 mt-1 whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-medium shadow-lg transition-opacity ${
          feedback ? 'opacity-100' : 'opacity-0'
        } ${
          feedback?.tone === 'error'
            ? 'border-rose-500/40 bg-rose-500/15 text-rose-200'
            : feedback?.tone === 'warn'
              ? 'border-amber-500/40 bg-amber-500/15 text-amber-200'
              : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
        }`}
      >
        {feedback?.message ?? ''}
      </span>
    </div>
  );
}

/** Copy text to the clipboard, falling back to a hidden textarea + execCommand. */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
