import { useMemo } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { getAlgorithm } from '@/algorithms/registry';
import {
  familyCssVars,
  paletteForCategory,
  type FamilyPalette,
} from '@/lib/family-palette';
import type { AlgorithmCategory } from '@/types/algorithm';

export interface FamilyTheme {
  category: AlgorithmCategory | null;
  palette: FamilyPalette | null;
  /** Inline-style map of `--family-*-rgb` custom properties (empty when no algo). */
  style: Record<string, string>;
}

/**
 * Resolves the family-coded theme for the currently selected algorithm. Returns
 * the palette plus a `style` map of CSS custom properties to spread onto a
 * container so the whole subtree inherits the family accent via the Tailwind
 * `family-*` tokens. Falls back to an empty style map (→ index.css indigo
 * defaults) when no algorithm is active.
 */
export function useFamilyTheme(): FamilyTheme {
  const algorithmId = useSessionStore((s) => s.algorithmId);

  return useMemo(() => {
    const meta = algorithmId ? getAlgorithm(algorithmId) : null;
    if (!meta) {
      return { category: null, palette: null, style: {} };
    }
    return {
      category: meta.category,
      palette: paletteForCategory(meta.category),
      style: familyCssVars(meta.category),
    };
  }, [algorithmId]);
}
