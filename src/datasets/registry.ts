/**
 * Dataset registry — single source of truth for the dataset picker.
 *
 * Built-in datasets are static. User-supplied (BYO) datasets live in the
 * session store; this registry consults the store so custom datasets resolve
 * through the exact same `getDataset` / `listDatasets` pathway the built-ins use.
 */

import type { Dataset, DatasetInfo } from '@/types/dataset';
import { iris } from '@/datasets/builtin/iris';
import { wine } from '@/datasets/builtin/wine';
import { makeShapes } from '@/datasets/builtin/shapes';
import { useSessionStore } from '@/stores/session-store';
import {
  makeAnisoBlobs,
  makeBlobs,
  makeCircles,
  makeGaussianMixture,
  makeLinear,
  makeMoons,
  makeNoisyLinear,
  makePolyData,
  makeSpirals,
} from '@/datasets/synthetic';

const datasets: Dataset[] = [
  iris,
  wine,
  makeBlobs({ nSamples: 150, centers: 3, std: 0.6, seed: 7 }),
  makeAnisoBlobs({ nSamples: 180, seed: 7 }),
  makeGaussianMixture({ nSamples: 200, seed: 7 }),
  makeMoons({ nSamples: 200, noise: 0.1, seed: 7 }),
  makeCircles({ nSamples: 200, noise: 0.05, seed: 7 }),
  makeSpirals({ nSamples: 240, noise: 0.18, seed: 7 }),
  makeLinear({ nSamples: 80, seed: 7 }),
  makePolyData({ nSamples: 80, noise: 0.6, seed: 7 }),
  makeNoisyLinear({ nSamples: 70, seed: 7 }),
  makeShapes({ nPerClass: 40, seed: 7 }),
];

const map = new Map<string, Dataset>(datasets.map((d) => [d.id, d]));

function toInfo(d: Dataset): DatasetInfo {
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

function customDatasets(): Dataset[] {
  return useSessionStore.getState().customDatasets;
}

export function listDatasets(): DatasetInfo[] {
  return [...datasets, ...customDatasets()].map(toInfo);
}

export function getDataset(id: string): Dataset | null {
  return map.get(id) ?? customDatasets().find((d) => d.id === id) ?? null;
}

