# AlgoVisualizer

> Edit real Python machine-learning code in your browser and watch the algorithm train, step by step, on real datasets.

<p align="center">
  <a href="https://algo-visualizer-beige.vercel.app">
    <img src="docs/hero.png" alt="The AlgoVisualizer workspace: editable Python on the left, a live K-Means clustering visualization in the center showing three converged colour-coded clusters with numbered centroids, and hyperparameter sliders on the right." width="100%" />
  </a>
</p>

<p align="center">
  <a href="https://algo-visualizer-beige.vercel.app"><b>▶&nbsp; Live demo</b></a>
  &nbsp;·&nbsp;
  <a href="https://algo-visualizer-beige.vercel.app/race">Algorithm Race</a>
  &nbsp;·&nbsp;
  <a href="#getting-started">Run it locally</a>
</p>

<details>
  <summary><b>More screenshots</b></summary>
  <br />
  <p align="center">
    <img src="docs/home.png" alt="The AlgoVisualizer home page: a grid of 25 algorithm cards across 5 categories, each with a short description and its default hyperparameters." width="100%" />
    <br />
    <em>Browse 25 algorithms across 5 categories from the home page.</em>
  </p>
</details>

AlgoVisualizer is an interactive, fully client-side playground for understanding how
classic ML algorithms actually work. Pick an algorithm, tweak a hyperparameter (or rewrite
the Python directly), and watch each iteration unfold — centroids moving, decision
boundaries warping, trees splitting, loss curves descending — with a plain-English
explanation and the matching math for every step.

Everything runs in the browser. The Python executes on **[Pyodide](https://pyodide.org/)**
(CPython compiled to WebAssembly), so there is no backend, no install, and your code never
leaves the page.

- **Live demo:** **[algo-visualizer-beige.vercel.app](https://algo-visualizer-beige.vercel.app)** — runs entirely in your browser. You can also deploy your own in one click; see [Deployment](#deployment).
- **Tech:** React 18 · TypeScript · Vite · Pyodide · D3 · Zustand · Tailwind CSS · Monaco.

---

## Table of contents

- [Features](#features)
- [How it works](#how-it-works)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Available scripts](#available-scripts)
- [Project structure](#project-structure)
- [The trace-event contract](#the-trace-event-contract)
- [Extending it](#extending-it)
- [Deployment](#deployment)
- [Performance](#performance)
- [Analytics](#analytics)
- [Documentation](#documentation)
- [License](#license)

---

## Features

- **25 algorithms across 5 categories** — supervised classification, supervised
  regression, unsupervised clustering, dimensionality reduction, and reinforcement
  learning. Each ships with editable Python, a canonical scikit-learn reference,
  complexity notes, pros/cons, and curated reading links.
- **Editable, runnable code** — a Monaco editor holds the real Python. Edit it and the
  visualization re-runs automatically (debounced).
- **Hyperparameter sliders** — drag a slider and it patches the exact value in the source,
  then re-runs. A "sweep" mode runs the algorithm across a range of values.
- **Step-by-step playback** — scrub, play, pause, and change speed. Every step carries an
  explanation and a LaTeX math expression.
- **20 built-in datasets + your own** — real (Iris, Wine), synthetic 2-D sets (blobs,
  moons, circles, spirals, Gaussian mixtures), regression trends (linear, polynomial,
  sine, Friedman), small image shapes for the CNN, and gridworld environments for RL. Or
  **bring your own**: upload a CSV or draw points by hand.
- **Algorithm Race** — run several algorithms side by side on the same dataset.
- **Active-learning modes** — _Quiz mode_ blurs the "what's happening" panel until you
  reveal it; _predict-then-reveal_ lets you guess an outcome before each run and tracks a
  streak; per-algorithm _challenges_ set goals like "reach ≥90% accuracy in ≤8 iterations".
- **Share & export** — copy a link that encodes your algorithm, edited code, hyperparameters
  and dataset, or export the current visualization as a PNG.
- **Friendly errors** — Python exceptions are translated into plain-English explanations.
- **Installable PWA** — works offline after the first load (the Pyodide runtime is cached)
  and prompts before applying an update instead of silently reloading.
- **Accessible & responsive** — full keyboard transport, reduced-motion support, and a
  layout that adapts from a three-column desktop workspace to a tabbed mobile view.
- **Zero backend** — static hosting only; all computation is client-side.

## How it works

```mermaid
flowchart LR
  UI[React UI<br/>Monaco · sliders] -->|code + hyperparams| Store[Zustand<br/>session store]
  Store --> Ctrl[Training controller]
  Ctrl -->|Comlink RPC| Worker[Pyodide Web Worker]
  Worker -->|exec user run<br/>generator| Py[CPython + NumPy<br/>WASM]
  Py -->|yields trace events| Worker
  Worker -->|stream events| Ctrl
  Ctrl --> Store
  Store --> Viz[D3 / SVG<br/>visualizations]
```

1. Each algorithm is a small Python module exposing a generator
   `run(X, y=None, **kwargs)` that **yields plain dicts** describing each step.
2. The user's code runs inside a Web Worker on Pyodide, so the heavy WASM work never
   blocks the UI thread. The main thread talks to the worker via
   [Comlink](https://github.com/GoogleChromeLabs/comlink).
3. Every yielded dict is a **trace event** with a `type` (e.g. `kmeans:assign`), a `step`,
   an `explanation`, and `math`, plus algorithm-specific payload. Events stream back to the
   store as they are produced.
4. A family-specific renderer reshapes each event into D3/SVG (scatter plots, decision-
   boundary contours, tree diagrams, loss charts, etc.).

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full design.

## Tech stack

| Concern            | Choice                                                        |
| ------------------ | ------------------------------------------------------------- |
| UI                 | React 18 + TypeScript                                         |
| Build tool         | Vite 5                                                        |
| Python runtime     | Pyodide (CPython + NumPy, compiled to WebAssembly)            |
| Worker bridge      | Comlink                                                       |
| State              | Zustand (with `subscribeWithSelector`)                        |
| Code editor        | Monaco (`@monaco-editor/react`)                               |
| Visualization      | D3 scales + hand-rolled SVG (one charting engine — no Recharts)|
| Math typesetting   | KaTeX (`react-katex`)                                         |
| Styling            | Tailwind CSS; Google Material Symbols (subsetted)             |
| Routing            | React Router                                                  |
| Offline / PWA      | `vite-plugin-pwa` + Workbox (prompt-to-update)                |

## Getting started

### Prerequisites

- **Node.js 18+** and npm.

### Install & run

```bash
git clone https://github.com/dhruv-15-03/AlgoVisualizer.git
cd AlgoVisualizer
npm install
npm run dev
```

Open the printed URL (default `http://localhost:5173`). The first algorithm run downloads
the Pyodide runtime (~10 MB) once; subsequent runs are instant.

## Available scripts

| Script              | What it does                                            |
| ------------------- | ------------------------------------------------------- |
| `npm run dev`       | Start the Vite dev server with HMR.                     |
| `npm run build`     | Type-check (`tsc --noEmit`) then build to `dist/`.      |
| `npm run preview`   | Serve the production build locally.                     |
| `npm run lint`      | ESLint over `ts`/`tsx` (zero warnings allowed).         |
| `npm run typecheck` | Type-check only, no emit.                               |
| `npm run test`      | Run the Vitest unit suite once.                         |
| `npm run test:watch`| Run Vitest in watch mode.                               |
| `npm run test:e2e`  | Run the Playwright end-to-end suite.                    |

## Project structure

```
src/
├─ algorithms/        # Per-algorithm metadata (*.ts) + Python source (python/*.py)
│  └─ registry.ts     # Single source of truth for the algorithm picker
├─ controllers/       # Glue between the store and the Pyodide worker
├─ datasets/          # Built-in, synthetic, and gridworld datasets + their registry
├─ hooks/             # Reusable React hooks (keyboard transport, theming, a11y)
├─ lib/               # Framework-agnostic helpers (challenges, predictions, sharing, …)
├─ pages/             # Route entry points (Home, Workspace, Race)
├─ stores/            # Zustand stores (session, race)
├─ types/             # Shared types — trace events are the core contract
├─ visualizations/    # Family-specific D3/SVG renderers + VizRouter
├─ workers/           # Pyodide Web Worker + its Comlink client
└─ components/        # UI primitives (ui/) and workspace panels (workspace/)
docs/                 # Architecture notes and the original wireframe
e2e/                  # Playwright end-to-end tests
```

## The trace-event contract

The boundary between Python and the renderer is one TypeScript file:
[`src/types/trace.ts`](src/types/trace.ts). Every Python `run()` generator yields dicts
that match one of the `TraceEvent` shapes. For example, K-Means yields:

```python
yield {
    "type": "kmeans:assign",
    "step": step,
    "labels": labels.tolist(),
    "inertia": inertia,
    "explanation": "Each point assigned to its nearest centroid.",
    "math": r"c_i = \arg\min_j \| x_i - \mu_j \|^2",
}
```

The `type` prefix (`kmeans`, `boundary`, `cluster`, `projection`, …) selects which
renderer draws the step. Adding a new algorithm usually means reusing one of the generic
families (`boundary` for any 2-D classifier, `cluster` for clustering, `projection` for
dimensionality reduction) so no new renderer is needed.

## Extending it

Adding an algorithm or dataset is intentionally mechanical. The full step-by-step guide —
including the trace families you can reuse and the one manual step the build can't check
for you (the Material Symbols icon subset) — lives in
[`CONTRIBUTING.md`](CONTRIBUTING.md).

## Deployment

The app is a static SPA and deploys to any static host. It is preconfigured for **Vercel**
via [`vercel.json`](vercel.json):

1. Push to GitHub.
2. Import the repo at [vercel.com/new](https://vercel.com/new) — Vite is auto-detected
   (build `npm run build`, output `dist`). No environment variables are required.

`vercel.json` adds an SPA rewrite so deep links like `/workspace/kmeans` resolve to
`index.html` instead of 404-ing, and sets a one-year immutable cache on fingerprinted
`/assets/*`.

## Performance

The initial Home payload is kept small (~115 KB gzipped) through:

- **Route-level code splitting** — `WorkspacePage` and `RacePage` (which pull in Monaco,
  KaTeX, D3, and the worker) are lazy-loaded; Home ships only the entry + React + router.
- **Vendor chunk splitting** — Monaco, charts (D3), math (KaTeX), router, and React are
  split so a code change doesn't bust their long-lived caches.
- **Font subsetting** — Material Symbols is requested with an explicit `icon_names=` subset
  (~8.5 KB instead of ~600 KB) while keeping all four variable-font axes.
- **Idle prewarming** — while you read the Home page, the Workspace bundle and the Pyodide
  runtime download during browser idle time, so entering the workspace feels instant.

## Analytics

[Microsoft Clarity](https://clarity.microsoft.com) (anonymous session replay + heatmaps) is
**consent-gated**. Nothing is requested from Clarity until the visitor clicks "Accept" on
the consent banner (`src/components/ConsentBanner.tsx`); a stored "declined" choice loads
nothing on future visits. The loader and project id live in
[`src/lib/consent.ts`](src/lib/consent.ts) — clear `CLARITY_PROJECT_ID` (or remove the
`maybeLoadClarity` call in `src/App.tsx`) to disable it entirely.

## Documentation

- [`CONTRIBUTING.md`](CONTRIBUTING.md) — dev setup, code conventions, and how to add an
  algorithm or dataset.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — data flow, module responsibilities, and
  the worker boundary in depth.

## License

Released under the [MIT License](LICENSE).
