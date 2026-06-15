/**
 * Bundle-size budget guard.
 *
 * The entry chunk loads on every page, so heavy, route-specific payloads
 * (Python algorithm sources, dataset generators, Monaco, D3, KaTeX…) must stay
 * in their own lazily-loaded chunks instead of the eager graph. This script
 * gzips the built chunks we care about and fails CI if any exceeds its budget.
 *
 * If the `index` (entry) budget fails, you almost certainly added a *static*
 * import that pulled a heavy module into the eager graph. Fix it by turning the
 * import into a dynamic `import()` or moving it behind a lazy route — don't just
 * bump the budget. Only raise a budget when the growth is genuinely unavoidable
 * (for example, many new algorithm metas legitimately enlarging the registry).
 *
 * Usage: `npm run build` then `npm run size:check`.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const ASSETS = join('dist', 'assets');

// Gzipped-size budgets, in KB, keyed by chunk-name prefix (the part before the
// content hash). Generous headroom is intentional: the goal is to catch a heavy
// module accidentally landing in the entry chunk (which would add tens of KB),
// not to nitpick small, expected growth.
const BUDGETS_KB = {
  index: 40,
};

function gzipKB(file) {
  return gzipSync(readFileSync(file)).length / 1024;
}

let files;
try {
  files = readdirSync(ASSETS);
} catch {
  console.error(`\u2717 ${ASSETS} not found. Run \`npm run build\` first.`);
  process.exit(1);
}

const failures = [];
const rows = [];

for (const [name, budget] of Object.entries(BUDGETS_KB)) {
  const match = files.find((f) => f.startsWith(`${name}-`) && f.endsWith('.js'));
  if (!match) {
    failures.push(`Expected a "${name}-*.js" chunk in ${ASSETS}, but none was found.`);
    continue;
  }
  const size = gzipKB(join(ASSETS, match));
  const ok = size <= budget;
  if (!ok) {
    failures.push(`"${match}" is ${size.toFixed(2)} kB gzip, over the ${budget} kB budget.`);
  }
  rows.push({
    chunk: match,
    'gzip (KB)': size.toFixed(2),
    'budget (KB)': budget,
    status: ok ? 'ok' : 'OVER',
  });
}

console.table(rows);

if (failures.length > 0) {
  console.error('\nBundle-size budget exceeded:');
  for (const f of failures) console.error(`  \u2717 ${f}`);
  console.error(
    '\nLikely cause: a static import pulled a heavy module into the eager chunk.\n' +
      'Prefer a dynamic import() or a lazy route over raising the budget.',
  );
  process.exit(1);
}

console.log('\n\u2713 Bundle-size budgets OK.');
