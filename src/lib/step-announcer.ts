/**
 * step-announcer — turns the current trace event into a concise, human sentence
 * for the screen-reader live region ("What's happening now").
 *
 * Pure and family-aware: every branch reads only fields already present on the
 * event (loss / inertia / accuracy / labels / reason / …) so the announcement
 * stays in lock-step with what the visualization draws, without recomputing
 * anything. The React layer (`LiveAnnouncer`) throttles + de-dupes; this module
 * just maps state → text.
 */

import type { TraceEvent } from '@/types/trace';

/** Format a metric to at most 3 decimals, trimming trailing zeros. */
function num(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  const rounded = Math.round(value * 1000) / 1000;
  return String(rounded);
}

/**
 * Format an accuracy as a percentage. Accepts either a 0–1 fraction or an
 * already-scaled 0–100 value (some families emit one, some the other).
 */
function pct(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  const scaled = value <= 1 ? value * 100 : value;
  return `${Math.round(scaled)}%`;
}

/** "iteration 7" when the event carries one, else "step 8". */
function position(ev: TraceEvent, index: number): string {
  if (typeof ev.iteration === 'number') return `iteration ${ev.iteration}`;
  return `step ${index + 1}`;
}

/**
 * Map a single trace event to a one-sentence announcement.
 *
 * @param ev    the event at `index`
 * @param index zero-based position within the events array
 * @param total total number of events captured so far
 */
export function describeTraceEvent(ev: TraceEvent, index: number, total: number): string {
  switch (ev.type) {
    // ─── K-Means ──────────────────────────────────────────────────────────
    case 'kmeans:init':
      return `K-means: placed ${ev.centroids.length} initial centroids.`;
    case 'kmeans:assign':
      return `K-means: reassigning points to the nearest centroid. Inertia ${num(ev.inertia)}.`;
    case 'kmeans:update':
      return `K-means: moved ${ev.moved} ${ev.moved === 1 ? 'centroid' : 'centroids'}. Inertia ${num(ev.inertia)}.`;
    case 'kmeans:converged':
      return `K-means converged. ${ev.reason}`;

    // ─── Linear Regression ────────────────────────────────────────────────
    case 'linreg:init':
      return `Linear regression: starting gradient descent. Loss ${num(ev.loss)}.`;
    case 'linreg:step':
      return `Linear regression — ${position(ev, index)}. Loss ${num(ev.loss)}.`;
    case 'linreg:converged':
      return `Linear regression converged. Final loss ${num(ev.finalLoss)}. ${ev.reason}`;

    // ─── Polynomial Regression ────────────────────────────────────────────
    case 'polyreg:init':
      return `Polynomial regression (degree ${ev.degree}): starting gradient descent. Loss ${num(ev.loss)}.`;
    case 'polyreg:step':
      return `Polynomial regression — ${position(ev, index)}. Loss ${num(ev.loss)}.`;
    case 'polyreg:converged':
      return `Polynomial regression converged. Final loss ${num(ev.finalLoss)}. ${ev.reason}`;

    // ─── Logistic Regression ──────────────────────────────────────────────
    case 'logreg:init':
      return `Logistic regression: starting gradient descent. Loss ${num(ev.loss)}, accuracy ${pct(ev.accuracy)}.`;
    case 'logreg:step':
      return `Logistic regression — ${position(ev, index)}. Loss ${num(ev.loss)}, accuracy ${pct(ev.accuracy)}.`;
    case 'logreg:converged':
      return `Logistic regression converged. Final loss ${num(ev.finalLoss)}, accuracy ${pct(ev.finalAccuracy)}. ${ev.reason}`;

    // ─── Decision Tree ────────────────────────────────────────────────────
    case 'dtree:open':
      return `Decision tree: examining a node at depth ${ev.node.depth}.`;
    case 'dtree:split':
      return `Decision tree: splitting on ${ev.featureName} at threshold ${num(ev.threshold)}.`;
    case 'dtree:leaf':
      return `Decision tree: created a leaf predicting class ${ev.prediction}.`;
    case 'dtree:done':
      return `Decision tree complete: ${ev.totalNodes} nodes, ${ev.totalLeaves} leaves, depth ${ev.maxDepthReached}.`;

    // ─── Generic 2D classifier (KNN / NB / SVM / …) ───────────────────────
    case 'boundary:init':
      return `${ev.label}: initialized.`;
    case 'boundary:step': {
      const bits: string[] = [];
      if (typeof ev.accuracy === 'number') bits.push(`accuracy ${pct(ev.accuracy)}`);
      if (typeof ev.loss === 'number') bits.push(`loss ${num(ev.loss)}`);
      const tail = bits.length ? ` ${bits.join(', ')}.` : '';
      return `${ev.label}: updating the decision boundary —${tail || ' working.'}`;
    }
    case 'boundary:converged': {
      const acc = typeof ev.finalAccuracy === 'number' ? ` Final accuracy ${pct(ev.finalAccuracy)}.` : '';
      return `${ev.label} finished.${acc} ${ev.reason}`;
    }

    // ─── Generic clustering (DBSCAN / Hierarchical / GMM) ─────────────────
    case 'cluster:init':
      return `${ev.label}: initialized.`;
    case 'cluster:step': {
      const metric =
        typeof ev.metric === 'number'
          ? ` ${ev.metricLabel ?? 'metric'} ${num(ev.metric)}.`
          : '';
      return `${ev.label}: updating clusters.${metric}`;
    }
    case 'cluster:merge':
      return `${ev.label}: merged two clusters; ${ev.numClusters} remain.`;
    case 'cluster:converged':
      return `${ev.label} converged with ${ev.numClusters} clusters. ${ev.reason}`;

    // ─── Dimensionality reduction (PCA / t-SNE) ───────────────────────────
    case 'projection:init':
      return `${ev.label}: initialized.`;
    case 'projection:step': {
      const loss = typeof ev.loss === 'number' ? ` Loss ${num(ev.loss)}.` : '';
      return `${ev.label}: projecting the data.${loss}`;
    }
    case 'projection:converged':
      return `${ev.label} finished. ${ev.reason}`;

    // ─── Random Forest ────────────────────────────────────────────────────
    case 'forest:tree_grown':
      return `Random forest: grew tree ${ev.treeIndex + 1} of ${ev.totalTrees}. Ensemble accuracy ${pct(ev.ensembleAccuracy)}.`;
    case 'forest:converged':
      return `Random forest finished with ${ev.totalTrees} trees. Final accuracy ${pct(ev.finalAccuracy)}. ${ev.reason}`;

    // ─── Multi-Layer Perceptron ───────────────────────────────────────────
    case 'mlp:init':
      return `Neural network: initialized. Loss ${num(ev.loss)}, accuracy ${pct(ev.accuracy)}.`;
    case 'mlp:step':
      return `Neural network — ${position(ev, index)}. Loss ${num(ev.loss)}, accuracy ${pct(ev.accuracy)}.`;
    case 'mlp:converged':
      return `Neural network converged. Final loss ${num(ev.finalLoss)}, accuracy ${pct(ev.finalAccuracy)}. ${ev.reason}`;

    // ─── Convolutional Neural Network ─────────────────────────────────────
    case 'cnn:init':
      return `CNN: initialized. Loss ${num(ev.loss)}, accuracy ${pct(ev.accuracy)}.`;
    case 'cnn:step':
      return `CNN — ${position(ev, index)}. Loss ${num(ev.loss)}, accuracy ${pct(ev.accuracy)}.`;
    case 'cnn:converged':
      return `CNN converged. Final loss ${num(ev.finalLoss)}, accuracy ${pct(ev.finalAccuracy)}. ${ev.reason}`;

    // ─── Universal lifecycle ──────────────────────────────────────────────
    case 'error':
      return `Error: ${ev.message}`;
    case 'finished':
      return `Run finished after ${ev.totalSteps} steps.`;

    default: {
      // Exhaustiveness guard — if a new family is added without a branch, fall
      // back to its explanation rather than going silent.
      const fallback = ev as TraceEvent;
      return fallback.explanation || `Step ${index + 1} of ${total}.`;
    }
  }
}

/**
 * Announcement text for the current playback position. Returns '' when there is
 * nothing to announce (no events yet). `currentStep` is clamped defensively.
 */
export function announceForStep(events: TraceEvent[], currentStep: number): string {
  if (events.length === 0) return '';
  const index = Math.max(0, Math.min(currentStep, events.length - 1));
  return describeTraceEvent(events[index], index, events.length);
}
