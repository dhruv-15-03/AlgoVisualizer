/**
 * Lightweight, consent-gated error reporting.
 *
 * The app has no dedicated error backend (and we don't want to ship a heavy
 * SDK), but flying blind after launch is worse. This forwards uncaught errors
 * to Microsoft Clarity — which the user has *already* consented to and which is
 * already loaded — as custom tags + a custom event, so production crashes show
 * up in the analytics dashboard instead of disappearing into users' consoles.
 *
 * Hard rules:
 *   - Nothing is sent unless the visitor accepted analytics (same gate as
 *     Clarity itself) AND the Clarity tag is actually present.
 *   - Reporting must never throw; a broken reporter can't be allowed to break
 *     the app it's trying to observe.
 *   - We send a truncated `name: message`, never full stack traces or user
 *     code, to avoid leaking anything sensitive into analytics.
 */

import { hasAccepted } from '@/lib/consent';

type ClarityFn = (...args: unknown[]) => void;
interface ClarityWindow extends Window {
  clarity?: ClarityFn;
}

export type ErrorSource = 'react' | 'window' | 'unhandledrejection';

export interface ErrorContext {
  source: ErrorSource;
  /** React component stack, when the error came from an ErrorBoundary. */
  componentStack?: string;
}

/** Max characters of the error string forwarded to analytics. */
const MAX_MESSAGE_LEN = 250;

function describe(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return { name: error.name || 'Error', message: error.message || String(error) };
  }
  return { name: 'Error', message: typeof error === 'string' ? error : String(error) };
}

/**
 * Report a single error. Always logs to the console (local debugging); only
 * forwards to Clarity when the user has consented and the tag is loaded.
 */
export function reportError(error: unknown, context: ErrorContext): void {
  const { name, message } = describe(error);

  // Local visibility regardless of consent.
  console.error(`[error:${context.source}] ${name}: ${message}`, context.componentStack ?? '');

  if (typeof window === 'undefined') return;
  if (!hasAccepted()) return;

  const w = window as ClarityWindow;
  if (typeof w.clarity !== 'function') return;

  try {
    w.clarity('set', 'lastErrorSource', context.source);
    w.clarity('set', 'lastError', `${name}: ${message}`.slice(0, MAX_MESSAGE_LEN));
    w.clarity('event', 'app-error');
  } catch {
    /* reporting must never throw */
  }
}

let installed = false;

/**
 * Install global `error` + `unhandledrejection` listeners that route into
 * {@link reportError}. Idempotent; returns a disposer that removes them.
 */
export function installGlobalErrorReporting(
  target: Window | undefined = typeof window !== 'undefined' ? window : undefined,
): () => void {
  if (!target || installed) return () => {};
  installed = true;

  const onError = (e: ErrorEvent): void => {
    reportError(e.error ?? e.message, { source: 'window' });
  };
  const onRejection = (e: PromiseRejectionEvent): void => {
    reportError(e.reason, { source: 'unhandledrejection' });
  };

  target.addEventListener('error', onError);
  target.addEventListener('unhandledrejection', onRejection);

  return () => {
    target.removeEventListener('error', onError);
    target.removeEventListener('unhandledrejection', onRejection);
    installed = false;
  };
}
