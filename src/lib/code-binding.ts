/**
 * Two-way binding between hyperparameter sliders and Python code.
 *
 *   patchCode(code, "k=", 5)   — patches "k=3" or "k = 3" to "k=5"
 *   extractValue(code, "k=")   — reads "k=5" back out of the code
 *
 * The first match wins; conventions are anchored on the algorithm's `def run`
 * signature where each hyperparam appears exactly once.
 */

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildRegex(codeKey: string): RegExp {
  // codeKey is e.g. "k=" or "max_iter=".
  // Tolerate optional whitespace around '='. Capture: (keyName \s* = \s*)(value).
  const keyName = codeKey.replace(/=$/, '').trim();
  return new RegExp(
    `(\\b${escapeRegex(keyName)}\\s*=\\s*)([-+]?\\d*\\.?\\d+(?:[eE][-+]?\\d+)?|true|false|True|False|"[^"]*"|'[^']*')`,
  );
}

function formatValue(value: number | string | boolean): string {
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return value.toString();
    return value.toString();
  }
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  return JSON.stringify(value);
}

export function patchCode(
  code: string,
  codeKey: string,
  value: number | string | boolean,
): string {
  const re = buildRegex(codeKey);
  if (!re.test(code)) return code;
  return code.replace(re, `$1${formatValue(value)}`);
}

export function extractValue(code: string, codeKey: string): number | string | boolean | null {
  const re = buildRegex(codeKey);
  const m = code.match(re);
  if (!m) return null;
  const raw = m[2];
  if (raw === 'true' || raw === 'True') return true;
  if (raw === 'false' || raw === 'False') return false;
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

/**
 * Find the 1-based line number where the codeKey appears (or null).
 * Useful for highlighting the patched line in Monaco.
 */
export function findLine(code: string, codeKey: string): number | null {
  const re = buildRegex(codeKey);
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    if (re.test(lines[i])) return i + 1;
  }
  return null;
}
