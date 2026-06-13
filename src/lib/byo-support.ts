/**
 * byo-support — decide whether (and how) "bring-your-own data" applies to a
 * given algorithm. Pure and testable; the UI uses it to enable/disable the
 * BYO controls and to populate a tooltip when they're disabled.
 */

import type { AlgorithmMeta } from '@/types/algorithm';
import type { CsvTask } from '@/lib/csv-dataset';

export interface ByoSupport {
  /** CSV upload is available. */
  csv: boolean;
  /** The 2D "draw points" canvas is available. */
  draw: boolean;
  /** Dataset task types the user may assign to a BYO dataset for this algorithm. */
  tasks: CsvTask[];
  /** Short reason BYO is unavailable, suitable for a tooltip (empty when available). */
  reason: string;
}

/**
 * @param meta the algorithm being viewed
 * @param isImageDataset whether the algorithm's data is image-shaped (e.g. CNN);
 *   such models can't consume a flat CSV / drawn 2D points.
 */
export function byoSupport(meta: AlgorithmMeta, isImageDataset: boolean): ByoSupport {
  const tasks = (meta.compatibleTasks ?? []).filter(
    (t): t is CsvTask => t === 'classification' || t === 'regression' || t === 'clustering',
  );

  if (isImageDataset) {
    return {
      csv: false,
      draw: false,
      tasks: [],
      reason: 'Custom data isn’t available for image models.',
    };
  }
  if (tasks.length === 0) {
    return {
      csv: false,
      draw: false,
      tasks: [],
      reason: 'This algorithm doesn’t accept tabular custom data.',
    };
  }

  // Drawing places 2D points with optional class labels — only meaningful for
  // classification / clustering, not pure regression.
  const draw = tasks.includes('classification') || tasks.includes('clustering');
  return { csv: true, draw, tasks, reason: '' };
}
