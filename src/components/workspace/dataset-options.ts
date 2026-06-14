/**
 * Builds the grouped option list for the workspace dataset picker.
 *
 * Every dataset is shown (grouped by its task), but a dataset is greyed out
 * (`disabled`) when the active algorithm cannot consume it — either because the
 * task is incompatible, or because the dataset exceeds a capability cap the
 * algorithm declares (e.g. a binary-only model like logistic regression facing
 * a 3-class dataset). Keeping incompatible datasets visible tells the learner
 * *why* a choice is unavailable rather than silently hiding it.
 */

import type { DatasetInfo } from '@/types/dataset';
import type { AlgorithmMeta } from '@/types/algorithm';

export interface DatasetOption {
  value: string;
  label: string;
  disabled?: boolean;
  title?: string;
}

export interface DatasetOptionGroup {
  label: string;
  options: DatasetOption[];
}

type Task = DatasetInfo['task'];

/** The subset of algorithm metadata the picker needs to gate datasets. */
type PickerAlgo = Pick<AlgorithmMeta, 'name' | 'compatibleTasks' | 'maxClasses' | 'vizMaxFeatures'>;

const TASK_ORDER: Task[] = ['classification', 'regression', 'clustering', 'reinforcement'];

const TASK_LABELS: Record<Task, string> = {
  classification: 'Classification',
  regression: 'Regression',
  clustering: 'Clustering',
  reinforcement: 'Reinforcement',
};

function optionLabel(d: DatasetInfo): string {
  return `${d.name} (${d.samples}×${d.features})`;
}

/**
 * Returns the reason a dataset is unavailable for the algorithm, or `undefined`
 * when it is a valid choice. The first failing check wins so the tooltip points
 * at the single most relevant blocker.
 */
function disableReason(d: DatasetInfo, algo: PickerAlgo): string | undefined {
  if (!algo.compatibleTasks.includes(d.task)) {
    return `${d.name} — ${TASK_LABELS[d.task]?.toLowerCase() ?? d.task} data; not suited for ${algo.name}`;
  }
  if (algo.maxClasses != null && d.classes != null && d.classes > algo.maxClasses) {
    const need = algo.maxClasses === 2 ? 'a 2-class' : `a ≤${algo.maxClasses}-class`;
    return `${algo.name} needs ${need} dataset; ${d.name} has ${d.classes} classes`;
  }
  if (algo.vizMaxFeatures != null && d.features > algo.vizMaxFeatures) {
    return `${d.name} has ${d.features} features; ${algo.name} visualizes up to ${algo.vizMaxFeatures}`;
  }
  return undefined;
}

export function datasetOptionGroups(
  datasets: DatasetInfo[],
  activeAlgo: PickerAlgo | null,
): DatasetOptionGroup[] {
  const groups: DatasetOptionGroup[] = [];

  for (const task of TASK_ORDER) {
    const inTask = datasets.filter((d) => d.task === task);
    if (inTask.length === 0) continue;
    groups.push({
      label: TASK_LABELS[task],
      options: inTask.map((d) => {
        const reason = activeAlgo ? disableReason(d, activeAlgo) : undefined;
        return {
          value: d.id,
          label: optionLabel(d),
          disabled: reason != null,
          title: reason,
        };
      }),
    });
  }

  // Surface any dataset with an unexpected task so nothing disappears silently.
  const known = new Set<Task>(TASK_ORDER);
  const other = datasets.filter((d) => !known.has(d.task));
  if (other.length > 0) {
    groups.push({
      label: 'Other',
      options: other.map((d) => ({ value: d.id, label: optionLabel(d) })),
    });
  }

  return groups;
}
