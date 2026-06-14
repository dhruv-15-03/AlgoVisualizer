/**
 * Builds the grouped option list for the workspace dataset picker.
 *
 * Every dataset is shown (grouped by its task), but datasets whose task the
 * active algorithm cannot consume are marked `disabled` so they render greyed
 * out instead of vanishing. Keeping incompatible datasets visible tells the
 * learner *why* a choice is unavailable rather than silently hiding it.
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

export function datasetOptionGroups(
  datasets: DatasetInfo[],
  activeAlgo: Pick<AlgorithmMeta, 'name' | 'compatibleTasks'> | null,
): DatasetOptionGroup[] {
  const groups: DatasetOptionGroup[] = [];

  for (const task of TASK_ORDER) {
    const inTask = datasets.filter((d) => d.task === task);
    if (inTask.length === 0) continue;
    const compatible = !activeAlgo || activeAlgo.compatibleTasks.includes(task);
    groups.push({
      label: TASK_LABELS[task],
      options: inTask.map((d) => ({
        value: d.id,
        label: optionLabel(d),
        disabled: !compatible,
        title: compatible
          ? undefined
          : `${d.name} — ${TASK_LABELS[task].toLowerCase()} data; not suited for ${activeAlgo!.name}`,
      })),
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
