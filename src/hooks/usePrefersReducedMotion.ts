import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * usePrefersReducedMotion — reactive read of the OS "reduce motion" setting.
 *
 * Returns `true` when the user has asked the system to minimize non-essential
 * motion. Components use this to shorten or skip animations (D3/SVG transitions,
 * autoplay easing, shimmer) while keeping all information on screen.
 *
 * SSR-safe: defaults to `false` when `window`/`matchMedia` are unavailable, and
 * subscribes with `addEventListener('change', …)` (with cleanup) so toggling the
 * OS setting updates the UI live.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mql = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    // Sync once in case the setting changed between initial state and effect.
    setPrefersReduced(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return prefersReduced;
}
