/**
 * draw-points — pure conversion of click-placed 2D points into a {@link Dataset}.
 *
 * Used by the BYO "draw points" canvas. Kept separate from the React component
 * so the validation/encoding logic is unit-testable without a DOM.
 */

import type { Dataset } from '@/types/dataset';
import { CSV_MIN_ROWS } from '@/lib/csv-dataset';

export interface DrawnPoint {
  x: number;
  y: number;
  /** Class index for classification; ignored for clustering. */
  label: number;
}

export interface DrawnToDatasetOptions {
  id: string;
  name: string;
  task: 'classification' | 'clustering';
  /** Human-readable class names; index aligns with `DrawnPoint.label`. */
  classNames?: string[];
  description?: string;
}

export type DrawnResult = { ok: true; dataset: Dataset } | { ok: false; error: string };

export const DRAW_MIN_POINTS = CSV_MIN_ROWS;

/**
 * Minimum gap (px) between consecutive drag-placed points, so a single drag
 * scatters spaced samples instead of dumping hundreds of overlapping ones —
 * which is also the right shape for a 2D scatter dataset.
 */
export const DRAW_DRAG_MIN_DISTANCE = 14;

/**
 * True when `next` is at least `minDist` px from `last` (or there is no `last`
 * yet). Pure geometry helper for the draw canvas's drag throttle; keeps the
 * density logic unit-testable without a DOM. Compares squared distance to skip
 * a sqrt.
 */
export function isFarEnough(
  last: { x: number; y: number } | null,
  next: { x: number; y: number },
  minDist: number = DRAW_DRAG_MIN_DISTANCE,
): boolean {
  if (!last) return true;
  const dx = next.x - last.x;
  const dy = next.y - last.y;
  return dx * dx + dy * dy >= minDist * minDist;
}

/**
 * Build a Dataset from drawn points. Returns a structured result; never throws.
 */
export function drawnPointsToDataset(
  points: DrawnPoint[],
  options: DrawnToDatasetOptions,
): DrawnResult {
  if (!Array.isArray(points) || points.length < DRAW_MIN_POINTS) {
    return { ok: false, error: `Place at least ${DRAW_MIN_POINTS} points.` };
  }
  if (points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) {
    return { ok: false, error: 'Every point needs finite x and y coordinates.' };
  }

  const X = points.map((p) => [p.x, p.y]);

  if (options.task === 'clustering') {
    return {
      ok: true,
      dataset: {
        id: options.id,
        name: options.name,
        description: options.description ?? `Drawn points · ${X.length} samples`,
        X,
        y: null,
        featureNames: ['x', 'y'],
        task: 'clustering',
        source: 'BYO',
      },
    };
  }

  // Classification: encode the labels that were actually used into a dense 0..k-1
  // range so class indices are contiguous regardless of which palette slots the
  // user picked.
  const usedOrder: number[] = [];
  const remap = new Map<number, number>();
  for (const p of points) {
    if (!remap.has(p.label)) {
      remap.set(p.label, usedOrder.length);
      usedOrder.push(p.label);
    }
  }
  if (usedOrder.length < 2) {
    return { ok: false, error: 'Use at least 2 classes for classification.' };
  }

  const y = points.map((p) => remap.get(p.label)!);
  const classNames = usedOrder.map((orig) => options.classNames?.[orig] ?? `Class ${orig + 1}`);

  return {
    ok: true,
    dataset: {
      id: options.id,
      name: options.name,
      description: options.description ?? `Drawn points · ${X.length} samples, ${classNames.length} classes`,
      X,
      y,
      featureNames: ['x', 'y'],
      classNames,
      task: 'classification',
      source: 'BYO',
    },
  };
}
