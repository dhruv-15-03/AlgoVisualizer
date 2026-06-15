/**
 * Dataset catalog — the lightweight listing surface for the dataset picker.
 *
 * This module intentionally imports ZERO dataset generators or Iris/Wine data
 * tables. It lists datasets from the static `BUILTIN_DATASET_INFO` catalog plus
 * any user-supplied datasets already living (fully generated) in the session
 * store. Keeping it generator-free is what lets the eager Home page list every
 * dataset without dragging ~25 KB of generator code + point data into the entry
 * chunk. Anything that needs a *materialized* `Dataset` must go through
 * `getDataset` in `registry.ts` instead.
 */

import type { Dataset, DatasetInfo } from '@/types/dataset';
import { useSessionStore } from '@/stores/session-store';
import { BUILTIN_DATASET_INFO } from '@/datasets/builtin-info';

export function toInfo(d: Dataset): DatasetInfo {
  return {
    id: d.id,
    name: d.name,
    description: d.description,
    samples: d.X.length,
    features: d.X[0]?.length ?? 0,
    classes: d.task === 'regression' || d.y === null ? null : new Set(d.y).size,
    task: d.task,
    source: d.source,
    imageShape: d.imageShape,
  };
}

export function listDatasets(): DatasetInfo[] {
  const custom = useSessionStore.getState().customDatasets;
  return [...BUILTIN_DATASET_INFO, ...custom.map(toInfo)];
}
