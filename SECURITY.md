# Security Policy

## Supported versions

AlgoVisualizer is a continuously deployed web app; only the latest version
released to <https://algo-visualizer-beige.vercel.app/> is supported.

## Reporting a vulnerability

Please **do not** open a public issue for security vulnerabilities.

Instead, report privately via GitHub's
[security advisories](https://github.com/dhruv-15-03/AlgoVisualizer/security/advisories/new)
("Report a vulnerability"). Include:

- a description of the issue and its impact,
- steps to reproduce (a proof of concept if possible),
- any suggested remediation.

You can expect an initial acknowledgement within a few days. Once confirmed,
we'll work on a fix and coordinate disclosure with you.

## Scope & threat model

AlgoVisualizer runs entirely client-side:

- All Python executes in a sandboxed **Pyodide (WebAssembly)** Web Worker in the
  user's own browser. There is no server-side code execution and no backend that
  stores user data.
- The only third parties contacted are the Pyodide/jsDelivr CDN (runtime), Google
  Fonts (icons), and — **only after explicit analytics consent** — Microsoft
  Clarity.
- Responses are hardened with security headers (`X-Content-Type-Options`,
  `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`) and a
  `Content-Security-Policy-Report-Only` policy in `vercel.json`.

Especially welcome: reports about XSS, content-injection through shared links or
user-supplied CSV/data, or CSP bypasses.
