# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project aims to follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **Per-algorithm SEO pages.** The production build now pre-renders a static,
  crawlable HTML page for each of the 25 algorithm workspaces
  (`/workspace/<id>`) with its own `<title>`, meta description, canonical URL,
  Open Graph tags, and `LearningResource` JSON-LD — generated from the algorithm
  registry so they can never drift (`scripts/prerender.mjs`).
- **Consent-gated error reporting** (`src/lib/error-reporting.ts`): uncaught
  errors and unhandled promise rejections, plus React error-boundary crashes,
  are forwarded to Microsoft Clarity as a custom event — but only when the user
  has accepted analytics. Always logs locally; never throws.
- **Security headers** in `vercel.json`: `X-Content-Type-Options`,
  `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, and an **enforced
  `Content-Security-Policy`** compatible with Pyodide, Monaco, fonts, and
  Clarity. The policy was first shipped in report-only mode and validated
  against the live app (zero violations across home, a full Pyodide/Monaco
  workspace run, and Clarity) before being promoted to enforcing.
- **Pyodide CDN resilience**: the runtime now loads with bounded retry + backoff
  (`src/lib/retry.ts`) and resets its load state on failure so a transient CDN
  hiccup no longer permanently wedges the workspace.
- **Lighthouse CI** budgets (`lighthouserc.json`) and an accessibility +
  user-journey Playwright suite (`e2e/a11y.spec.ts`, `e2e/journeys.spec.ts`).
- Repository hygiene: Dependabot, issue/PR templates, `CODEOWNERS`,
  `SECURITY.md`, and this changelog.

### Changed

- **Bundle optimization.** Heavy, route-specific payloads — the 25 Python
  algorithm sources, the built-in dataset generators, and the 25 sklearn-
  equivalent snippets — were moved out of the eager entry chunk into lazily
  loaded modules. The entry chunk shrank from ~63.9 kB to ~31.9 kB gzipped
  (~50% smaller). A CI gzip **size budget** (`scripts/check-bundle-size.mjs`)
  now guards against regressions.
