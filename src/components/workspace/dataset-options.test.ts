import { describe, it, expect } from 'vitest';
import { datasetOptionGroups } from '@/components/workspace/dataset-options';
import type { DatasetInfo } from '@/types/dataset';

function info(id: string, task: DatasetInfo['task'], classes: number | null = null): DatasetInfo {
  return {
    id,
    name: id,
    description: '',
    task,
    samples: 100,
    features: 2,
    classes: task === 'classification' ? (classes ?? 2) : null,
    source: 'test',
  };
}

const datasets: DatasetInfo[] = [
  info('iris', 'classification'),
  info('linear', 'regression'),
  info('blobs', 'clustering'),
  info('gridworld', 'reinforcement'),
];

function flat(groups: ReturnType<typeof datasetOptionGroups>) {
  return groups.flatMap((g) => g.options);
}

describe('datasetOptionGroups', () => {
  it('greys out a regression dataset for a classification algorithm', () => {
    const groups = datasetOptionGroups(datasets, {
      name: 'Logistic Regression',
      compatibleTasks: ['classification'],
    });
    const opts = flat(groups);
    expect(opts.find((o) => o.value === 'iris')?.disabled).toBe(false);
    expect(opts.find((o) => o.value === 'linear')?.disabled).toBe(true);
    expect(opts.find((o) => o.value === 'linear')?.title).toContain('Logistic Regression');
  });

  it('greys out a classification dataset for a regression algorithm', () => {
    const groups = datasetOptionGroups(datasets, {
      name: 'Ridge Regression',
      compatibleTasks: ['regression'],
    });
    const opts = flat(groups);
    expect(opts.find((o) => o.value === 'linear')?.disabled).toBe(false);
    expect(opts.find((o) => o.value === 'iris')?.disabled).toBe(true);
  });

  it('groups datasets by task in a stable order and keeps every dataset visible', () => {
    const groups = datasetOptionGroups(datasets, {
      name: 'K-Means',
      compatibleTasks: ['clustering', 'classification'],
    });
    expect(groups.map((g) => g.label)).toEqual([
      'Classification',
      'Regression',
      'Clustering',
      'Reinforcement',
    ]);
    expect(flat(groups)).toHaveLength(4);
    // Clustering + classification enabled, regression + reinforcement greyed.
    const opts = flat(groups);
    expect(opts.find((o) => o.value === 'blobs')?.disabled).toBe(false);
    expect(opts.find((o) => o.value === 'gridworld')?.disabled).toBe(true);
  });

  it('enables everything when no algorithm is active', () => {
    const groups = datasetOptionGroups(datasets, null);
    expect(flat(groups).every((o) => !o.disabled)).toBe(true);
  });

  it('greys out a 3-class dataset for a binary-only model (maxClasses=2)', () => {
    const pool: DatasetInfo[] = [
      info('moons', 'classification', 2),
      info('iris3', 'classification', 3),
    ];
    // Logistic Regression / SVM declare maxClasses: 2.
    const groups = datasetOptionGroups(pool, {
      name: 'Logistic Regression',
      compatibleTasks: ['classification'],
      maxClasses: 2,
    });
    const opts = flat(groups);
    expect(opts.find((o) => o.value === 'moons')?.disabled).toBe(false);
    expect(opts.find((o) => o.value === 'iris3')?.disabled).toBe(true);
    expect(opts.find((o) => o.value === 'iris3')?.title).toContain('3 classes');
  });

  it('keeps a 3-class dataset enabled for a multiclass model (no maxClasses)', () => {
    const pool: DatasetInfo[] = [
      info('moons', 'classification', 2),
      info('iris3', 'classification', 3),
    ];
    // KNN auto-adapts and has no maxClasses cap.
    const groups = datasetOptionGroups(pool, {
      name: 'K-Nearest Neighbors',
      compatibleTasks: ['classification'],
    });
    const opts = flat(groups);
    expect(opts.find((o) => o.value === 'moons')?.disabled).toBe(false);
    expect(opts.find((o) => o.value === 'iris3')?.disabled).toBe(false);
  });

  it('greys out a dataset exceeding an explicit vizMaxFeatures cap', () => {
    const pool: DatasetInfo[] = [
      { ...info('twoD', 'classification', 2), features: 2 },
      { ...info('wide', 'classification', 2), features: 13 },
    ];
    const groups = datasetOptionGroups(pool, {
      name: 'Capped Viz',
      compatibleTasks: ['classification'],
      vizMaxFeatures: 2,
    });
    const opts = flat(groups);
    expect(opts.find((o) => o.value === 'twoD')?.disabled).toBe(false);
    expect(opts.find((o) => o.value === 'wide')?.disabled).toBe(true);
    expect(opts.find((o) => o.value === 'wide')?.title).toContain('13 features');
  });
});
