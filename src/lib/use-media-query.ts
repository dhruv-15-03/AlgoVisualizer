import { useEffect, useState } from 'react';

/**
 * SSR-safe media-query hook. Returns true whenever the given query matches.
 * Listens for breakpoint changes so the UI re-flows on viewport resize / orientation
 * change without a manual reload.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    // Sync once on mount/query-change in case SSR initial state was wrong.
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// Tailwind breakpoint helpers — keep in sync with tailwind.config.js (defaults).
export const useIsSmUp = () => useMediaQuery('(min-width: 640px)');
export const useIsMdUp = () => useMediaQuery('(min-width: 768px)');
export const useIsLgUp = () => useMediaQuery('(min-width: 1024px)');
export const useIsXlUp = () => useMediaQuery('(min-width: 1280px)');
