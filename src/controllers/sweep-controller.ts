/**
 * Sweep controller — runs an algorithm N times with a varying hyperparameter,
 * collects the final metric per run, and reports progress.
 *
 * Calls the Pyodide worker directly (does NOT go through the session-store
 * trigger). This means it will cancel any in-flight main run and the main
 * panel will go quiet until the sweep finishes — which is fine: the user
 * explicitly opened the sweep dialog and is watching its results.
 */

import * as Comlink from 'comlink';
import { ensureWorker } from '@/workers/pyodide.client';
import { getDataset } from '@/datasets/registry';
import { patchCode } from '@/lib/code-binding';
import { extractMetric, type SweepPoint, type SweepResult } from '@/types/sweep';
import type { AlgorithmMeta } from '@/types/algorithm';

interface RunSweepArgs {
  algorithm: AlgorithmMeta;
  datasetId: string;
  baseCode: string;
  baseHyperparams: Record<string, number | string | boolean>;
  hyperparamId: string;
  values: number[];
  /** Called after each point (and on initial setup) so the UI can re-render. */
  onProgress: (points: SweepPoint[], currentIndex: number) => void;
  /** When this returns true, the sweep aborts gracefully. */
  shouldCancel: () => boolean;
}

export async function runSweep(args: RunSweepArgs): Promise<SweepResult> {
  const {
    algorithm,
    datasetId,
    baseCode,
    baseHyperparams,
    hyperparamId,
    values,
    onProgress,
    shouldCancel,
  } = args;

  const dataset = getDataset(datasetId);
  if (!dataset) {
    throw new Error(`Unknown dataset: ${datasetId}`);
  }
  const hpMeta = algorithm.hyperparams.find((h) => h.id === hyperparamId);
  if (!hpMeta) {
    throw new Error(`Unknown hyperparameter: ${hyperparamId}`);
  }

  const worker = ensureWorker();
  const points: SweepPoint[] = values.map((v) => ({
    value: v,
    metric: null,
    metricKind: null,
    totalEvents: 0,
    status: 'pending',
  }));
  onProgress(points, -1);

  let detectedKind: SweepPoint['metricKind'] = null;
  let detectedBetterIsHigher = false;

  for (let i = 0; i < values.length; i += 1) {
    if (shouldCancel()) {
      return finalize(points, detectedKind, detectedBetterIsHigher);
    }
    const value = values[i];
    const coerced = hpMeta.type === 'int' ? Math.round(value) : value;
    const code = patchCode(baseCode, hpMeta.codeKey, coerced);
    const hp = { ...baseHyperparams, [hyperparamId]: coerced };

    points[i] = { ...points[i], status: 'running' };
    onProgress([...points], i);

    const collected: Record<string, unknown>[] = [];
    const onEvent = Comlink.proxy((event: Record<string, unknown>) => {
      if (event.type === 'finished') return;
      collected.push(event);
    });

    try {
      const result = await worker.run(code, dataset.X, dataset.y, hp, onEvent);
      if (result.status === 'error') {
        points[i] = {
          ...points[i],
          status: 'error',
          errorMessage: result.message ?? 'Unknown error',
          totalEvents: collected.length,
        };
      } else if (result.status === 'cancelled') {
        // The sweep itself didn't cancel; some other run preempted us.
        // Mark this point as error so the user knows something went wrong.
        points[i] = {
          ...points[i],
          status: 'error',
          errorMessage: 'Run was cancelled (something else triggered a run).',
          totalEvents: collected.length,
        };
      } else {
        const m = extractMetric(collected);
        points[i] = {
          ...points[i],
          status: 'done',
          metric: m?.value ?? null,
          metricKind: m?.kind ?? null,
          totalEvents: collected.length,
        };
        if (m && !detectedKind) {
          detectedKind = m.kind;
          detectedBetterIsHigher = m.betterIsHigher;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      points[i] = { ...points[i], status: 'error', errorMessage: message };
    }

    onProgress([...points], i);
  }

  return finalize(points, detectedKind, detectedBetterIsHigher);
}

function finalize(
  points: SweepPoint[],
  metricKind: SweepPoint['metricKind'],
  betterIsHigher: boolean,
): SweepResult {
  let bestIndex: number | null = null;
  let bestMetric: number | null = null;
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    if (p.status !== 'done' || p.metric === null) continue;
    if (bestMetric === null) {
      bestMetric = p.metric;
      bestIndex = i;
    } else if (betterIsHigher ? p.metric > bestMetric : p.metric < bestMetric) {
      bestMetric = p.metric;
      bestIndex = i;
    }
  }
  return { points, metricKind, betterIsHigher, bestIndex };
}
