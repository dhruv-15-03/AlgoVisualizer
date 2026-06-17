import { describe, it, expect } from 'vitest';
import { BUILTIN_DATASET_INFO } from './builtin-info';
import { buildBuiltins, getDataset, listDatasets } from './registry';
import type { Dataset, DatasetInfo } from '@/types/dataset';

// Mirrors the private `toInfo` in registry.ts. The static catalog must stay
// byte-for-byte in sync with what the generators actually produce, otherwise the
// dataset picker would show stale sample/feature/class counts.
function derive(d: Dataset): DatasetInfo {
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

describe('built-in dataset info catalog · drift guard', () => {
  it('has one catalog entry per generated dataset, in the same order', () => {
    const generatedIds = buildBuiltins().map((d) => d.id);
    const catalogIds = BUILTIN_DATASET_INFO.map((d) => d.id);
    expect(catalogIds).toEqual(generatedIds);
  });

  it('each catalog entry matches the generated dataset exactly', () => {
    for (const info of BUILTIN_DATASET_INFO) {
      const ds = getDataset(info.id);
      expect(ds, `dataset "${info.id}" should be resolvable`).not.toBeNull();
      if (ds) expect(derive(ds)).toEqual(info);
    }
  });

  it('listDatasets() returns the static catalog when no custom datasets exist', () => {
    expect(listDatasets()).toEqual(BUILTIN_DATASET_INFO);
  });
});
