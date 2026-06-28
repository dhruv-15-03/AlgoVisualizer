# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project aims to follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **Fluent 2 elevation & depth design tokens.** Added a dark-tuned elevation
  scale to the Tailwind theme (`shadow-e2`/`e4`/`e8`/`e16`/`e28` two-layer
  ambient+key shadows, plus a recessed `shadow-well` inset), a raised surface
  shade (`ink-750`), a `250ms` duration step, and Fluent motion easing curves
  (`ease-standard`/`decel`/`accel`). Applied them as a design language over the
  existing system: panels and Home algorithm cards now rest on subtle
  elevation (cards lift on hover), metric tiles sit in recessed wells, and
  dialogs, banners, and flyout chips use consistent overlay shadows in place of
  ad-hoc Tailwind defaults. Pure CSS — no bundle or runtime cost, all
  accessibility and family-theming preserved.
- **Per-algorithm social cards (Open Graph images).** The build now generates a
  distinct 1200×630 share card for every algorithm into `dist/og/<id>.png`
  (`scripts/generate-og-images.mjs`), so a shared `/workspace/<id>` link unfurls
  with its own branded card (name, category, one-line description) instead of one
  generic image. Cards are rendered deterministically with satori → resvg using
  Inter embedded from the pinned `@fontsource/inter` devDep (no headless
  browser), driven by the live registry so new algorithms get a card
  automatically. `scripts/prerender.mjs` points each page's `og:image` /
  `twitter:image` / `og:image:alt` at the matching card, and `vercel.json` serves
  `/og/*` as static files.
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
  `Content-Security-Policy`**. The policy keeps `default-src 'self'` and locks
  down `object-src`, `base-uri`, and `frame-ancestors`, while explicitly
  allowing the exact origins the app uses: jsDelivr for the Monaco editor and
  KaTeX assets (script, style, font, and `connect`), `data:` fonts for Monaco's
  icon set, Google Fonts, and Microsoft Clarity. Validated against the live app
  with CSP violation reporting until clean.
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
