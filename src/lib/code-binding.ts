/**
 * Two-way binding between hyperparameter sliders and Python code.
 *
 *   patchCode(code, "k=", 5)   — patches "k=3" or "k = 3" to "k=5"
 *   extractValue(code, "k=")   — reads "k=5" back out of the code
 *
 * The first *non-comment* match wins; conventions are anchored on the
 * algorithm's `def run` signature where each hyperparam appears exactly once.
 *
 * Matching ignores Python comments so a hyperparameter mentioned in a `#`
 * comment above the real assignment can't shadow it. A `#` inside a string
 * literal is left intact (it isn't a comment), and trailing inline comments on
 * the same line as a real assignment still resolve the real value.
 */

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Blank out Python comments while preserving string length and structure.
 *
 * Every character from an unescaped `#` (outside a string literal) up to the
 * end of its line is replaced with a space; everything else — including `#`
 * inside `'…'`, `"…"`, and triple-quoted strings — is preserved verbatim.
 * Because the output has the exact same length as the input, character indices
 * line up, so callers can locate a match in the stripped text and splice the
 * original at the same offsets.
 */
export function stripComments(code: string): string {
  const chars = code.split('');
  const n = chars.length;
  let quote: '' | "'" | '"' | "'''" | '"""' = '';
  let i = 0;

  while (i < n) {
    const c = chars[i];

    if (quote) {
      // Inside a string literal.
      if (quote.length === 3) {
        if (c === quote[0] && chars[i + 1] === quote[0] && chars[i + 2] === quote[0]) {
          quote = '';
          i += 3;
          continue;
        }
        i += 1;
        continue;
      }
      // Single- or double-quoted string.
      if (c === '\\') {
        i += 2; // skip the escaped character
        continue;
      }
      if (c === quote || c === '\n') {
        // Closing quote, or an unterminated string broken by a newline.
        quote = '';
        i += 1;
        continue;
      }
      i += 1;
      continue;
    }

    // Outside any string literal.
    if (c === '#') {
      for (let j = i; j < n && chars[j] !== '\n'; j += 1) chars[j] = ' ';
      // Skip ahead to the newline; the loop will handle it normally.
      while (i < n && chars[i] !== '\n') i += 1;
      continue;
    }
    if (c === '"' || c === "'") {
      if (chars[i + 1] === c && chars[i + 2] === c) {
        quote = (c + c + c) as "'''" | '"""';
        i += 3;
        continue;
      }
      quote = c as "'" | '"';
      i += 1;
      continue;
    }
    i += 1;
  }

  return chars.join('');
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
  // Match against the comment-stripped view so a value mentioned in a comment
  // isn't patched. Indices line up with `code` (stripping preserves length),
  // so splice the formatted value into the original at the same offset.
  const m = re.exec(stripComments(code));
  if (!m) return code;
  const valueStart = m.index + m[1].length;
  const valueEnd = valueStart + m[2].length;
  return code.slice(0, valueStart) + formatValue(value) + code.slice(valueEnd);
}

export function extractValue(code: string, codeKey: string): number | string | boolean | null {
  const re = buildRegex(codeKey);
  const m = stripComments(code).match(re);
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
 * Useful for highlighting the patched line in Monaco. Comment lines are
 * ignored so the highlight lands on the real assignment.
 */
export function findLine(code: string, codeKey: string): number | null {
  const re = buildRegex(codeKey);
  const lines = stripComments(code).split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    if (re.test(lines[i])) return i + 1;
  }
  return null;
}
