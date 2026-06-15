/**
 * Dataset registry — single source of truth for the dataset picker.
 *
 * Built-in datasets are static. User-supplied (BYO) datasets live in the
 * session store; this registry consults the store so custom datasets resolve
 * through the exact same `getDataset` / `listDatasets` pathway the built-ins use.
 */

import type { Dataset } from '@/types/dataset';
import { iris } from '@/datasets/builtin/iris';
import { wine } from '@/datasets/builtin/wine';
import { makeShapes } from '@/datasets/builtin/shapes';
import { gridworld, gridworldOpen, cliffWalk, maze } from '@/datasets/gridworld';
import { useSessionStore } from '@/stores/session-store';
import {
  makeAnisoBlobs,
  makeBlobs,
  makeCircles,
  makeCollinear,
  makeFriedman,
  makeGaussianMixture,
  makeLinear,
  makeMoons,
  makeNoisyLinear,
  makePolyData,
  makeSine,
  makeSpirals,
  makeVariedBlobs,
} from '@/datasets/synthetic';

export const buildBuiltins = (): Dataset[] => [
  iris,
  wine,
  makeBlobs({ nSamples: 150, centers: 3, std: 0.6, seed: 7 }),
  makeAnisoBlobs({ nSamples: 180, seed: 7 }),
  makeGaussianMixture({ nSamples: 200, seed: 7 }),
  makeVariedBlobs({ nSamples: 180, seed: 7 }),
  makeMoons({ nSamples: 200, noise: 0.1, seed: 7 }),
  makeCircles({ nSamples: 200, noise: 0.05, seed: 7 }),
  makeSpirals({ nSamples: 240, noise: 0.18, seed: 7 }),
  makeLinear({ nSamples: 80, seed: 7 }),
  makePolyData({ nSamples: 80, noise: 0.6, seed: 7 }),
  makeNoisyLinear({ nSamples: 70, seed: 7 }),
  makeSine({ nSamples: 90, seed: 7 }),
  makeCollinear({ nSamples: 90, seed: 7 }),
  makeFriedman({ nSamples: 120, seed: 7 }),
  makeShapes({ nPerClass: 40, seed: 7 }),
  gridworld,
  gridworldOpen,
  cliffWalk,
  maze,
];

// The built-in datasets — Iris/Wine data tables plus every synthetic generator
// — are only materialized the first time a *full* Dataset is requested. Listing
// datasets uses the static BUILTIN_DATASET_INFO catalog instead, so neither the
// data nor the generator code is pulled into the eager Home/entry chunk, and no
// generation runs during the initial paint.
let builtinMap: Map<string, Dataset> | null = null;

function builtins(): Map<string, Dataset> {
  if (!builtinMap) {
    builtinMap = new Map(buildBuiltins().map((d) => [d.id, d]));
  }
  return builtinMap;
}

export function getDataset(id: string): Dataset | null {
  if (builtins().has(id)) return builtins().get(id) ?? null;
  const custom = useSessionStore.getState().customDatasets;
  return custom.find((d) => d.id === id) ?? null;
}

// Re-exported so callers that already pull `getDataset` from the registry can
// grab the lightweight listing from the same module. The implementation lives
// in the generator-free `catalog.ts`; Home imports it from there directly to
// keep the dataset generators out of the eager entry chunk.
export { listDatasets, toInfo } from '@/datasets/catalog';

