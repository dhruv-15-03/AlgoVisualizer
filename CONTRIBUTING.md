# Contributing to AlgoVisualizer

Thanks for your interest in improving AlgoVisualizer. This guide covers local setup, the
coding conventions the project follows, and the step-by-step recipes for the two most
common contributions: **adding an algorithm** and **adding a dataset**.

## Local setup

```bash
npm install
npm run dev
```

Before opening a pull request, make sure all three of these pass:

```bash
npm run lint        # ESLint, zero warnings allowed
npm run typecheck   # tsc --noEmit
npm run build       # type-check + production build
```

## Coding conventions

- **TypeScript everywhere.** Prefer precise types over `any`. The trace-event types in
  `src/types/trace.ts` are the contract between Python and the renderer — keep them honest.
- **Named exports.** Modules export named symbols (e.g. `export const kmeansMeta`,
  `export function VizRouter`). Pages are the only default-ish case and are still imported
  by name through their lazy wrappers.
- **Path alias.** Import from `@/…` (configured in `vite.config.ts` and `tsconfig.json`),
  not long relative chains.
- **Naming.** `camelCase` for variables/functions, `PascalCase` for components and types,
  `kebab-case`/lowercase for file names except React components which are `PascalCase.tsx`.
- **Comments only where they earn their place.** Explain *why*, not *what*. A short note
  above a non-obvious decision is welcome; narrating self-evident code is not. Keep them
  brief.
- **Styling** is Tailwind utility classes plus the shared component classes in
  `src/index.css` (`.panel`, `.metric`, …). Icons come from the `<Icon>` component — never
  hard-code emoji or raw SVG for UI affordances.

## Adding a new algorithm

Each algorithm is two files (Python source + TypeScript metadata) plus a few registrations.
If your algorithm fits an existing **trace family**, you don't need to write a renderer at
all. The generic families are:

- `boundary` — any 2-D classifier that can emit a grid of predictions (KNN, SVM, Naive
  Bayes, MLP-as-classifier…). Renders decision-boundary contours + scatter.
- `cluster` — clustering that emits per-point labels (DBSCAN, hierarchical, GMM…).
- `projection` — dimensionality reduction that emits 2-D coordinates (PCA, t-SNE).

Use a dedicated family only when the visualization is genuinely bespoke (trees, CNN feature
maps, loss-curve regressions).

### 1. Write the Python generator

Create `src/algorithms/python/<id>.py`. It must define:

```python
import numpy as np

def run(X, y=None, **kwargs):
    # ... yield one dict per step ...
    yield {
        "type": "boundary:step",   # selects the renderer family
        "step": 0,
        "explanation": "Plain-English description of this step.",
        "math": r"\text{LaTeX for the math panel}",
        # ...family-specific payload (see src/types/trace.ts)...
    }
```

Only NumPy is available (Pyodide loads it for you). Convert arrays with `.tolist()` before
yielding — the worker JSON-serializes each event.

### 2. Add the metadata

Create `src/algorithms/<id>.ts`:

```ts
import type { AlgorithmMeta } from '@/types/algorithm';

export const <id>Meta: AlgorithmMeta = {
  id: '<id>',
  family: 'boundary',                  // matches the trace family you yield
  name: 'Human Name',
  shortDescription: '…',
  longDescription: '…',
  category: 'supervised-classification',
  task: 'classification',
  // The Python source is loaded lazily from src/algorithms/python/<id>.py via
  // getAlgorithmSource(pythonFilename) so it never ships in the Home/entry
  // chunk. Just point at the filename — do NOT `?raw`-import it here.
  pythonFilename: '<id>.py',
  hyperparams: [/* sliders that patch codeKey into the source */],
  timeComplexity: 'O(…)',
  spaceComplexity: 'O(…)',
  pros: ['…'],
  cons: ['…'],
  compatibleTasks: ['classification'],
  references: [/* optional reading links */],
};
```

The canonical sklearn snippet shown in the info panel lives separately in
`src/algorithms/sklearn-snippets.ts` (keyed by id), not on the meta — it's only
read by the lazy Workspace panel, so keeping it out of the metadata keeps it out
of the eager Home/entry chunk. Add an entry there for your new id; the
`Record<AlgorithmId, string>` type makes a missing snippet a compile error.

Hyperparameter sliders work by string-patching the source: each one's `codeKey` (e.g.
`k=`) must appear verbatim in your Python `run()` signature so the slider can rewrite it.

### 3. Register the type and the meta

- Add the id to the `AlgorithmId` union in `src/types/algorithm.ts`.
- Import and add your `<id>Meta` to the `algorithms` array in
  `src/algorithms/registry.ts`, in the appropriate category block.

### 4. (New family only) Define trace events and a renderer

Skip this if you reused `boundary` / `cluster` / `projection`.

- Add your event interfaces and a `…Event` union to `src/types/trace.ts`, fold it into the
  top-level `TraceEvent` union, and add the family prefix to `AlgorithmFamily` and
  `FAMILY_PREFIXES`.
- Create `src/visualizations/<Name>Viz.tsx` and wire the family into the `switch` in
  `src/visualizations/VizRouter.tsx`.

### 5. Keep the icon subset in sync

If your UI uses an `<Icon name="…">` that isn't already in the app, you **must** add that
name to the alphabetically-sorted `icon_names=` list in `index.html`. The Material Symbols
font is subsetted for performance, and there is no build-time check — a missing name
renders as raw ligature text. (See the note at the top of `src/components/ui/Icon.tsx`.)

### 6. Verify

Run `npm run lint && npm run typecheck && npm run build`, then `npm run dev` and confirm the
algorithm appears in the picker, runs, and steps through cleanly.

## Adding a dataset

1. Add a generator to `src/datasets/synthetic.ts` (procedural data) or a module under
   `src/datasets/builtin/` (fixed data), returning a `Dataset`.
2. Register it in the `datasets` array in `src/datasets/registry.ts`.

`listDatasets()` derives sample/feature/class counts automatically, so no extra metadata is
needed.

## Commit & pull-request conventions

- Use clear, conventional-style commit subjects where practical:
  `feat:`, `fix:`, `perf:`, `chore:`, `docs:`, `refactor:`.
- Keep each PR focused. Describe what changed and why, and confirm lint + typecheck + build
  pass.

## Project layout

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for module responsibilities and the data
flow between the UI, the store, the Pyodide worker, and the renderers.
