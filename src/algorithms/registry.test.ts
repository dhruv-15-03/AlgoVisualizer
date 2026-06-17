import { describe, it, expect } from 'vitest';
// Vite `?raw` import: read VizRouter's source so we can assert each algorithm
// family has a `case` without importing the heavy D3 viz components.
import vizRouterSource from '@/visualizations/VizRouter.tsx?raw';
import { listAlgorithms } from '@/algorithms/registry';
import { getAlgorithmSource } from '@/algorithms/algorithm-sources';
import { getDataset } from '@/datasets/registry';
import { DEFAULT_DATASET_BY_ALGO } from '@/algorithms/default-datasets';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const supportedFamilies = new Set(
  Array.from(vizRouterSource.matchAll(/case\s+'([^']+)':/g)).map((m) => m[1]),
);

const algorithms = listAlgorithms();

describe('algorithm registry · integrity', () => {
  it('registers at least the expected 25 algorithms', () => {
    expect(algorithms.length).toBeGreaterThanOrEqual(25);
  });

  it('has unique algorithm ids', () => {
    const ids = algorithms.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('VizRouter exposes at least one family case', () => {
    expect(supportedFamilies.size).toBeGreaterThan(0);
  });

  it('DEFAULT_DATASET_BY_ALGO has exactly one entry per registered algorithm', () => {
    const algoIds = new Set(algorithms.map((a) => a.id));
    const mapIds = new Set(Object.keys(DEFAULT_DATASET_BY_ALGO));
    expect(mapIds).toEqual(algoIds);
  });
});

for (const meta of algorithms) {
  describe(`algorithm · ${meta.id}`, () => {
    it('has a non-empty default Python source', () => {
      const source = getAlgorithmSource(meta.pythonFilename);
      expect(typeof source).toBe('string');
      expect(source.trim().length).toBeGreaterThan(0);
    });

    it('has a family that VizRouter can render', () => {
      expect(supportedFamilies.has(meta.family)).toBe(true);
    });

    it('maps to a real default dataset', () => {
      const datasetId = DEFAULT_DATASET_BY_ALGO[meta.id];
      expect(datasetId, `no DEFAULT_DATASET_BY_ALGO entry for ${meta.id}`).toBeTruthy();
      expect(getDataset(datasetId), `dataset "${datasetId}" not found in registry`).not.toBeNull();
    });

    it('declares a non-empty hyperparams array', () => {
      expect(Array.isArray(meta.hyperparams)).toBe(true);
      expect(meta.hyperparams.length).toBeGreaterThan(0);
    });

    it('has valid, code-bound hyperparameters', () => {
      for (const hp of meta.hyperparams) {
        expect(hp.id, 'hyperparam id').toBeTruthy();
        expect(hp.label, `${hp.id} label`).toBeTruthy();
        expect(typeof hp.codeKey, `${hp.id} codeKey`).toBe('string');
        expect(hp.codeKey.length, `${hp.id} codeKey`).toBeGreaterThan(0);
        expect(['int', 'float', 'enum']).toContain(hp.type);

        if (hp.type === 'int' || hp.type === 'float') {
          expect(Number.isFinite(hp.min), `${hp.id} min`).toBe(true);
          expect(Number.isFinite(hp.max), `${hp.id} max`).toBe(true);
          expect(hp.min as number, `${hp.id} min<max`).toBeLessThan(hp.max as number);
          if (hp.step !== undefined) {
            expect(hp.step, `${hp.id} step`).toBeGreaterThan(0);
          }
          expect(typeof hp.default, `${hp.id} default is numeric`).toBe('number');
          expect(hp.default as number).toBeGreaterThanOrEqual(hp.min as number);
          expect(hp.default as number).toBeLessThanOrEqual(hp.max as number);
        } else {
          // enum
          expect(Array.isArray(hp.options), `${hp.id} options`).toBe(true);
          expect(hp.options?.length, `${hp.id} options`).toBeGreaterThan(0);
          expect(hp.options, `${hp.id} default in options`).toContain(hp.default);
        }

        // The slider must have a real assignment to patch in the default code.
        const keyName = hp.codeKey.replace(/=\s*$/, '').trim();
        const assigned = new RegExp(`\\b${escapeRegExp(keyName)}\\s*=`).test(
          getAlgorithmSource(meta.pythonFilename),
        );
        expect(assigned, `codeKey "${hp.codeKey}" not assigned in ${meta.id} source`).toBe(true);
      }
    });
  });
}
