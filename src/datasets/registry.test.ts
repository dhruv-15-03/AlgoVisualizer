import { describe, it, expect } from 'vitest';
import { getDataset, listDatasets } from '@/datasets/registry';
import { makeSine, makeCollinear, makeFriedman, makeVariedBlobs } from '@/datasets/synthetic';
import type { DatasetInfo } from '@/types/dataset';

const NEW_REGRESSION = ['sine', 'collinear', 'friedman'];
const NEW_CLUSTERING = ['varied-blobs'];
const NEW_RL = ['cliff-walk', 'maze'];
const ALL_NEW = [...NEW_REGRESSION, ...NEW_CLUSTERING, ...NEW_RL];

describe('dataset registry · structural integrity', () => {
  const all = listDatasets();

  it('every dataset resolves and has consistent X/y shapes', () => {
    for (const info of all) {
      const ds = getDataset(info.id);
      expect(ds, info.id).not.toBeNull();
      if (!ds) continue;
      expect(ds.X.length).toBeGreaterThan(0);
      const width = ds.X[0].length;
      expect(ds.X.every((row) => row.length === width), `${info.id} rows`).toBe(true);
      if (ds.y !== null) {
        expect(ds.y.length, `${info.id} y length`).toBe(ds.X.length);
      }
      expect(['classification', 'regression', 'clustering', 'reinforcement']).toContain(ds.task);
    }
  });

  it('exposes at least 4 valid datasets for every task category', () => {
    const byTask = (t: DatasetInfo['task']) => all.filter((d) => d.task === t).length;
    expect(byTask('classification')).toBeGreaterThanOrEqual(4);
    expect(byTask('regression')).toBeGreaterThanOrEqual(5);
    expect(byTask('clustering')).toBeGreaterThanOrEqual(4);
    expect(byTask('reinforcement')).toBeGreaterThanOrEqual(4);
  });
});

describe('dataset registry · new datasets', () => {
  it.each(ALL_NEW)('%s resolves and appears in listDatasets', (id) => {
    expect(getDataset(id), id).not.toBeNull();
    expect(listDatasets().some((d) => d.id === id)).toBe(true);
  });

  it.each(NEW_REGRESSION)('%s is a regression dataset with a numeric target', (id) => {
    const ds = getDataset(id)!;
    expect(ds.task).toBe('regression');
    expect(ds.y).not.toBeNull();
    expect(ds.y!.length).toBe(ds.X.length);
  });

  it.each(NEW_CLUSTERING)('%s is a clustering dataset', (id) => {
    expect(getDataset(id)!.task).toBe('clustering');
  });

  it.each(NEW_RL)('%s is a rectangular gridworld with a start and a goal', (id) => {
    const ds = getDataset(id)!;
    expect(ds.task).toBe('reinforcement');
    expect(ds.y).toBeNull();
    const width = ds.X[0].length;
    expect(ds.X.every((row) => row.length === width)).toBe(true);
    const cells = ds.X.flat();
    expect(cells).toContain(4); // start
    expect(cells).toContain(2); // goal
  });
});

describe('dataset generators · deterministic under a fixed seed', () => {
  it('makeSine is reproducible', () => {
    expect(makeSine({ seed: 7 }).X).toEqual(makeSine({ seed: 7 }).X);
  });
  it('makeCollinear is reproducible and has 4 features', () => {
    const a = makeCollinear({ seed: 7 });
    expect(a.X).toEqual(makeCollinear({ seed: 7 }).X);
    expect(a.X[0]).toHaveLength(4);
  });
  it('makeFriedman is reproducible and has 5 features', () => {
    const a = makeFriedman({ seed: 7 });
    expect(a.y).toEqual(makeFriedman({ seed: 7 }).y);
    expect(a.X[0]).toHaveLength(5);
  });
  it('makeVariedBlobs is reproducible', () => {
    expect(makeVariedBlobs({ seed: 7 }).X).toEqual(makeVariedBlobs({ seed: 7 }).X);
  });
});
