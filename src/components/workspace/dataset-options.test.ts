import { describe, it, expect } from 'vitest';
import { datasetOptionGroups } from '@/components/workspace/dataset-options';
import type { DatasetInfo } from '@/types/dataset';

function info(id: string, task: DatasetInfo['task']): DatasetInfo {
  return {
    id,
    name: id,
    description: '',
    task,
    samples: 100,
    features: 2,
    classes: task === 'classification' ? 2 : null,
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
});
