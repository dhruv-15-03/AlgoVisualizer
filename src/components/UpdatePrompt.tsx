import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Icon } from '@/components/ui/Icon';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { cn } from '@/lib/cn';

/**
 * UpdatePrompt — non-blocking "new version available" toast for the PWA.
 *
 * The service worker is registered with `registerType: 'prompt'` (see
 * vite.config.ts), so a freshly deployed build installs in the background but
 * does NOT take over the open tab. This component surfaces that waiting update
 * as a dismissible toast with an explicit **Reload** control.
 *
 * Why prompt instead of auto-reload: the app holds expensive, destroyable state
 * — a ~10 MB warm Pyodide runtime, possibly an in-progress training run, and the
 * learner's edited Monaco code. A silent forced reload would wipe that work
 * mid-session, so the reload only ever happens on an explicit user click.
 *
 * Mounted once at the app root so it shows on every route.
 */

// How often a long-lived open tab re-checks the server for a newer deploy.
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
// How long the "ready to work offline" confirmation lingers before self-dismissing.
const OFFLINE_READY_TIMEOUT_MS = 6000;

export function UpdatePrompt() {
  const reducedMotion = usePrefersReducedMotion();
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      // Periodically poll for a fresh deploy so a tab left open for hours
      // eventually notices a new build and surfaces the prompt, instead of
      // pinning the user to the version they loaded this morning.
      setInterval(() => {
        void registration.update();
      }, UPDATE_CHECK_INTERVAL_MS);
    },
  });

  // The offline-ready confirmation is informational; auto-dismiss it so it
  // never lingers. The update prompt, by contrast, stays until acted on.
  useEffect(() => {
    if (!offlineReady) return;
    const id = setTimeout(() => setOfflineReady(false), OFFLINE_READY_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [offlineReady, setOfflineReady]);

  if (!needRefresh && !offlineReady) return null;

  const cardBase =
    'pointer-events-auto w-full max-w-sm rounded-xl border bg-ink-800/95 p-4 shadow-e16 backdrop-blur supports-[backdrop-filter]:bg-ink-800/80';
  // Respect the OS reduce-motion setting: skip the entrance animation entirely
  // rather than relying solely on the global CSS duration collapse.
  const anim = reducedMotion ? '' : 'animate-fade-in';

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-end gap-2 p-3 sm:inset-x-auto sm:right-4 sm:p-4">
      {needRefresh ? (
        <div role="status" aria-live="polite" className={cn(cardBase, 'border-accent-500/60', anim)}>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-accent-300">
              <Icon name="sync" size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-semibold text-ink-50">
                A new version is available
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-300">
                Reload to get the latest AlgoVisualizer. Nothing reloads until you choose to, so
                your current work stays put.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void updateServiceWorker(true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md bg-accent-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-800"
                >
                  <Icon name="refresh" size={14} />
                  Reload
                </button>
                <button
                  type="button"
                  onClick={() => setNeedRefresh(false)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md border border-ink-600 px-3 py-1.5 text-xs font-semibold text-ink-200 transition-colors hover:bg-ink-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-500 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-800"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : offlineReady ? (
        <div role="status" aria-live="polite" className={cn(cardBase, 'border-ink-700', anim)}>
          <div className="flex items-center gap-3">
            <span className="text-ok">
              <Icon name="check_circle" size={20} fill />
            </span>
            <p className="text-sm font-medium text-ink-100">Ready to work offline</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
