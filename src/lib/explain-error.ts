/**
 * explain-error — turn a raw Python/NumPy traceback into a friendly,
 * actionable explanation.
 *
 * This is a pure, dependency-free mapping: it never runs code, never touches
 * the DOM, and is total (an unrecognized traceback falls back to a generic but
 * still-helpful explanation). The raw traceback is always passed through on the
 * `raw` field so the UI can keep it available in an expandable section — this
 * augments error reporting without swallowing or altering it.
 */

export type ErrorCategory =
  | 'NameError'
  | 'SyntaxError'
  | 'IndentationError'
  | 'ValueError'
  | 'ShapeMismatch'
  | 'ZeroDivisionError'
  | 'ModuleNotFoundError'
  | 'TypeError'
  | 'IndexError'
  | 'KeyError'
  | 'AttributeError'
  | 'Convergence'
  | 'Timeout'
  | 'Unknown';

export interface ExplainedError {
  /** Machine-readable category, handy for tests/telemetry. */
  category: ErrorCategory;
  /** Short friendly headline. */
  title: string;
  /** One or two sentences, in plain English, describing what went wrong. */
  plainEnglish: string;
  /** Ordered, concrete things to try. */
  suggestions: string[];
  /** The original traceback, untouched, for the expandable "raw" section. */
  raw: string;
}

/** Pull the final `ExceptionType: message` line out of a traceback, if present. */
export function extractExceptionLine(traceback: string): { type: string; message: string } | null {
  const lines = traceback
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  // Walk from the bottom: the final exception line is what actually stopped it.
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const m = /^([A-Za-z_][\w.]*(?:Error|Exception|Warning)):?(?:\s+(.*))?$/.exec(lines[i]);
    if (m) {
      const type = m[1].includes('.') ? m[1].slice(m[1].lastIndexOf('.') + 1) : m[1];
      return { type, message: (m[2] ?? '').trim() };
    }
  }
  return null;
}

function has(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * Map a raw traceback to a friendly explanation. Always returns a value.
 */
export function explainError(traceback: string | null | undefined): ExplainedError {
  const raw = typeof traceback === 'string' ? traceback : '';
  const lower = raw.toLowerCase();
  const exc = extractExceptionLine(raw);
  const type = exc?.type ?? '';
  const message = exc?.message ?? '';

  // --- Safety-limit / timeout (our worker raises a plain message) ---
  if (has(raw, 'exceeded') && (has(raw, 'limit') || has(raw, 'safety'))) {
    return {
      category: 'Timeout',
      title: 'Run stopped — safety limit hit',
      plainEnglish:
        'The run was halted because it produced too many steps or ran too long, which usually means a loop never finishes.',
      suggestions: [
        'Check that your training loop has a stopping condition (e.g. a fixed number of iterations).',
        'Lower the number of iterations / epochs in the hyperparameters.',
        'Make sure any `while` loop updates the variable it checks so it can exit.',
      ],
      raw,
    };
  }

  // --- Convergence / NaN / overflow (often a warning, not a hard exception) ---
  if (
    has(raw, 'did not converge') ||
    has(raw, 'failed to converge') ||
    has(lower, 'nan') ||
    has(raw, 'overflow encountered') ||
    has(raw, 'invalid value encountered') ||
    has(raw, 'divide by zero encountered')
  ) {
    return {
      category: 'Convergence',
      title: 'Numbers blew up (NaN / overflow / no convergence)',
      plainEnglish:
        'The maths produced NaN or infinite values, or the algorithm never settled. This is usually caused by a learning rate that is too high, unscaled features, or dividing by something that became zero.',
      suggestions: [
        'Lower the learning rate (try 10× smaller).',
        'Standardize/normalize the features before training.',
        'Reduce the number of iterations or add a convergence tolerance.',
        'Guard divisions against zero and clip very large values.',
      ],
      raw,
    };
  }

  // --- ModuleNotFoundError / ImportError ---
  if (type === 'ModuleNotFoundError' || type === 'ImportError' || has(raw, 'no module named')) {
    const modMatch = /no module named ['"]?([\w.]+)['"]?/i.exec(raw);
    const mod = modMatch?.[1];
    return {
      category: 'ModuleNotFoundError',
      title: mod ? `Module “${mod}” isn’t available` : 'A module isn’t available',
      plainEnglish: mod
        ? `Your code tried to import “${mod}”, which isn’t installed in this in-browser Python runtime.`
        : 'Your code tried to import a module that isn’t installed in this in-browser Python runtime.',
      suggestions: [
        'Only NumPy and the Python standard library are available here — stick to those.',
        'Remove or replace the unavailable import.',
        mod ? `Double-check the spelling of “${mod}”.` : 'Double-check the import name spelling.',
      ],
      raw,
    };
  }

  // --- NameError ---
  if (type === 'NameError' || has(raw, 'is not defined')) {
    const nameMatch = /name ['"]?([\w]+)['"]? is not defined/i.exec(raw);
    const name = nameMatch?.[1];
    return {
      category: 'NameError',
      title: name ? `“${name}” is used before it’s defined` : 'A name is used before it’s defined',
      plainEnglish: name
        ? `Python reached “${name}” but nothing with that name exists yet — it’s usually a typo, a missing assignment, or a forgotten import alias (like \`np\`).`
        : 'Python reached a name that doesn’t exist yet — usually a typo, a missing assignment, or a forgotten import.',
      suggestions: [
        name ? `Make sure “${name}” is defined (or imported) before this line.` : 'Define the name before using it.',
        'Check for typos and capitalization (Python is case-sensitive).',
        'If it’s NumPy, ensure you have `import numpy as np`.',
      ],
      raw,
    };
  }

  // --- IndentationError / TabError (subclasses of SyntaxError; check first) ---
  if (type === 'IndentationError' || type === 'TabError' || has(raw, 'indentation') || has(raw, 'unindent')) {
    return {
      category: 'IndentationError',
      title: 'Indentation doesn’t line up',
      plainEnglish:
        'Python uses indentation to group code. A line is indented more or less than expected, or tabs and spaces are mixed.',
      suggestions: [
        'Use 4 spaces per indentation level, consistently.',
        'Don’t mix tabs and spaces — pick spaces.',
        'Check the body of `def`, `for`, `if`, and `while` blocks is indented one level in.',
      ],
      raw,
    };
  }

  // --- SyntaxError ---
  if (type === 'SyntaxError' || has(raw, 'invalid syntax') || has(raw, 'unexpected eof')) {
    return {
      category: 'SyntaxError',
      title: 'The code can’t be parsed',
      plainEnglish:
        'Python couldn’t understand the structure of the code. This is typically a missing colon, an unclosed bracket/quote, or a stray character.',
      suggestions: [
        'Check for a missing `:` at the end of `def`/`for`/`if`/`while` lines.',
        'Make sure every `(`, `[`, `{` and quote is closed.',
        'Look at the line the traceback points to — the real cause is often the line just before it.',
      ],
      raw,
    };
  }

  // --- ValueError: shape mismatch is the most common ML case ---
  if (type === 'ValueError') {
    const isShape =
      has(raw, 'shape') ||
      has(raw, 'dimension') ||
      has(raw, 'aligned') ||
      has(raw, 'broadcast') ||
      has(raw, 'size');
    if (isShape) {
      return {
        category: 'ShapeMismatch',
        title: 'Array shapes don’t match',
        plainEnglish:
          'A NumPy operation got arrays whose shapes are incompatible — for example multiplying matrices whose inner dimensions differ, or adding arrays of different sizes.',
        suggestions: [
          'Print the `.shape` of each array right before the failing line.',
          'For matrix multiply `A @ B`, the columns of A must equal the rows of B.',
          'Reshape or transpose so the dimensions line up (e.g. `X.reshape(-1, 1)`).',
        ],
        raw,
      };
    }
    return {
      category: 'ValueError',
      title: 'A value isn’t what the function expected',
      plainEnglish: message
        ? `A function received a value it can’t work with: “${message}”.`
        : 'A function received a value it can’t work with (wrong range, type, or contents).',
      suggestions: [
        'Read the message — it usually names the bad value or expected range.',
        'Validate inputs before the call (shape, dtype, allowed values).',
      ],
      raw,
    };
  }

  // --- ZeroDivisionError ---
  if (type === 'ZeroDivisionError' || has(raw, 'division by zero')) {
    return {
      category: 'ZeroDivisionError',
      title: 'Division by zero',
      plainEnglish:
        'Something was divided by zero. In ML this often happens when normalizing by a standard deviation, count, or norm that turned out to be zero.',
      suggestions: [
        'Add a tiny epsilon to the denominator, e.g. `/ (std + 1e-8)`.',
        'Check for empty clusters/groups that make a count zero.',
        'Guard the division with an `if denom != 0:` check.',
      ],
      raw,
    };
  }

  // --- TypeError ---
  if (type === 'TypeError') {
    return {
      category: 'TypeError',
      title: 'An operation got the wrong type',
      plainEnglish: message
        ? `An operation was used on the wrong kind of value: “${message}”.`
        : 'An operation was used on the wrong kind of value (e.g. calling something that isn’t a function, or mixing a number and None).',
      suggestions: [
        'Check the types going into the failing line (a `None`, a list vs a NumPy array, etc.).',
        'Make sure you’re calling functions with the arguments they expect.',
      ],
      raw,
    };
  }

  // --- IndexError ---
  if (type === 'IndexError' || has(raw, 'index out of') || has(raw, 'out of bounds')) {
    return {
      category: 'IndexError',
      title: 'Index out of range',
      plainEnglish:
        'The code indexed past the end of an array or list — the index is too large (or negative beyond the length).',
      suggestions: [
        'Check loop bounds use `len(...)` rather than a hard-coded number.',
        'Print the array length and the index right before the failing line.',
      ],
      raw,
    };
  }

  // --- KeyError ---
  if (type === 'KeyError') {
    return {
      category: 'KeyError',
      title: message ? `Missing key ${message}` : 'Missing dictionary key',
      plainEnglish:
        'A dictionary was asked for a key that doesn’t exist — often a misspelled hyperparameter name.',
      suggestions: [
        'Check the key spelling against where the dictionary is created.',
        'Use `dict.get(key, default)` when a key may be absent.',
      ],
      raw,
    };
  }

  // --- AttributeError ---
  if (type === 'AttributeError') {
    return {
      category: 'AttributeError',
      title: 'That attribute/method doesn’t exist',
      plainEnglish: message
        ? `An object was asked for something it doesn’t have: “${message}”.`
        : 'An object was asked for an attribute or method it doesn’t have — often a typo or a `None` where an array was expected.',
      suggestions: [
        'Check the spelling of the attribute/method.',
        'Confirm the object is what you think (e.g. a NumPy array, not `None`).',
      ],
      raw,
    };
  }

  // --- Fallback ---
  return {
    category: 'Unknown',
    title: exc ? `${type} during your run` : 'Your code hit an error',
    plainEnglish: message
      ? `Python stopped with: “${message}”. The expandable traceback below shows exactly where.`
      : 'Python stopped with an error. The expandable traceback below shows exactly where it happened.',
    suggestions: [
      'Read the last line of the traceback — it names the error and a short reason.',
      'Find the line number it points to in your code and inspect the values there.',
    ],
    raw,
  };
}
