import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSessionStore } from '@/stores/session-store';
import { getAlgorithm } from '@/algorithms/registry';
import { getDataset } from '@/datasets/registry';
import { DEFAULT_DATASET_BY_ALGO } from '@/algorithms/default-datasets';
import { byoSupport } from '@/lib/byo-support';
import { Icon } from '@/components/ui/Icon';
import { ByoDataModal } from '@/components/workspace/ByoDataModal';
import type { AlgorithmId } from '@/types/algorithm';

/**
 * "Custom data" affordance for the top nav. Computes whether bring-your-own
 * data applies to the current algorithm and either opens the BYO modal or
 * renders a disabled button with an explanatory tooltip.
 */
export function ByoDataButton() {
  const { algoId } = useParams<{ algoId?: AlgorithmId }>();
  // Subscribe so the button re-evaluates support when the active dataset changes.
  useSessionStore((s) => s.datasetId);
  const [open, setOpen] = useState(false);

  const meta = algoId ? getAlgorithm(algoId) : null;
  if (!meta) return null;

  const defaultDatasetId = DEFAULT_DATASET_BY_ALGO[meta.id];
  const isImageDataset = Boolean(defaultDatasetId && getDataset(defaultDatasetId)?.imageShape);
  const support = byoSupport(meta, isImageDataset);
  const enabled = support.csv || support.draw;

  return (
    <>
      <button
        onClick={() => enabled && setOpen(true)}
        disabled={!enabled}
        title={enabled ? 'Use your own dataset for this algorithm' : support.reason}
        aria-label={enabled ? 'Use your own data' : `Custom data unavailable: ${support.reason}`}
        className="touch-target inline-flex items-center justify-center gap-1.5 rounded-md border border-ink-600 px-2 py-1 text-xs font-medium text-ink-300 hover:border-accent-400 hover:text-accent-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-ink-600 disabled:hover:text-ink-300"
      >
        <Icon name="upload_file" size={16} />
        <span className="hidden md:inline">Custom data</span>
      </button>
      {open && <ByoDataModal support={support} onClose={() => setOpen(false)} />}
    </>
  );
}
