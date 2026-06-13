/**
 * csv-dataset — pure, dependency-free CSV → Dataset parsing & validation.
 *
 * Turns a user-uploaded CSV string into a {@link Dataset} that flows through
 * the exact same registry pathway as the built-in datasets. All failure modes
 * return a structured `{ ok: false, error }` with a human-readable message —
 * nothing throws, so the UI can surface problems inline.
 *
 * Rules:
 *  - Feature columns must be fully numeric (int/float/negative/scientific).
 *  - A header row is auto-detected (any non-numeric cell among feature columns)
 *    or can be forced on/off.
 *  - For `classification`, the label column may be categorical; labels are
 *    encoded to 0..k-1 and surfaced via `classNames`.
 *  - For `regression`, the label column must be numeric.
 *  - For `clustering`, there is no label column.
 */

import type { Dataset } from '@/types/dataset';

export const CSV_MAX_ROWS = 5000;
export const CSV_MAX_COLS = 64;
export const CSV_MIN_ROWS = 4;
export const CSV_MIN_FEATURES = 1;

export type CsvTask = 'classification' | 'regression' | 'clustering';

export interface CsvToDatasetOptions {
  id: string;
  name: string;
  task: CsvTask;
  /** Column index used as the label/target. `'last'` resolves to the final column. Ignored for clustering. */
  labelColumn?: number | 'last' | null;
  /** Force header handling; default `'auto'`. */
  hasHeader?: boolean | 'auto';
  description?: string;
}

export type CsvResult =
  | { ok: true; dataset: Dataset }
  | { ok: false; error: string };

/**
 * Tokenize CSV text into a grid of string cells. Handles quoted fields with
 * embedded commas, quotes (`""`), and newlines. Trailing blank lines are
 * dropped; a trailing newline does not create an empty row.
 */
export function tokenizeCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let sawAny = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      sawAny = true;
      continue;
    }
    if (ch === ',') {
      sawAny = true;
      pushField();
      continue;
    }
    if (ch === '\n' || ch === '\r') {
      // Normalize CRLF / CR / LF; only end a row if we have content on it.
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      if (field.length > 0 || row.length > 0 || sawAny) {
        pushRow();
      }
      sawAny = false;
      continue;
    }
    field += ch;
    sawAny = true;
  }
  // Flush the last field/row if the file didn't end with a newline.
  if (field.length > 0 || row.length > 0) pushRow();

  // Drop rows that are entirely empty (e.g. a stray blank line).
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

/** Parse a single cell as a finite number, or null if it isn't one. */
export function parseNumericCell(cell: string): number | null {
  const t = cell.trim();
  if (t === '') return null;
  // Number() accepts ints, floats, negatives, scientific notation; reject
  // hex/Infinity/whitespace-only and anything non-finite.
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function resolveLabelColumn(
  labelColumn: number | 'last' | null | undefined,
  nCols: number,
): number | null {
  if (labelColumn === null || labelColumn === undefined) return null;
  if (labelColumn === 'last') return nCols - 1;
  if (labelColumn < 0) return nCols + labelColumn;
  return labelColumn;
}

/**
 * Parse CSV text into a {@link Dataset}. Returns a structured result; never throws.
 */
export function csvToDataset(text: string, options: CsvToDatasetOptions): CsvResult {
  if (typeof text !== 'string' || text.trim() === '') {
    return { ok: false, error: 'The file is empty.' };
  }

  const grid = tokenizeCsv(text);
  if (grid.length === 0) {
    return { ok: false, error: 'The file is empty.' };
  }

  const nCols = grid[0].length;
  if (nCols < 1) return { ok: false, error: 'No columns found.' };
  if (nCols > CSV_MAX_COLS) {
    return { ok: false, error: `Too many columns (${nCols}); the limit is ${CSV_MAX_COLS}.` };
  }

  // Every row must have the same column count.
  for (let r = 0; r < grid.length; r += 1) {
    if (grid[r].length !== nCols) {
      return {
        ok: false,
        error: `Row ${r + 1} has ${grid[r].length} columns but expected ${nCols}.`,
      };
    }
  }

  const labelCol =
    options.task === 'clustering' ? null : resolveLabelColumn(options.labelColumn ?? 'last', nCols);
  if (labelCol !== null && (labelCol < 0 || labelCol >= nCols)) {
    return { ok: false, error: `Label column ${labelCol} is out of range (0–${nCols - 1}).` };
  }

  const featureCols: number[] = [];
  for (let c = 0; c < nCols; c += 1) if (c !== labelCol) featureCols.push(c);
  if (featureCols.length < CSV_MIN_FEATURES) {
    return { ok: false, error: `Need at least ${CSV_MIN_FEATURES} feature column.` };
  }

  // Header detection: a header row has a non-numeric cell in a feature column.
  let hasHeader: boolean;
  if (options.hasHeader === true || options.hasHeader === false) {
    hasHeader = options.hasHeader;
  } else {
    hasHeader = featureCols.some((c) => parseNumericCell(grid[0][c]) === null);
  }

  const header = hasHeader ? grid[0] : null;
  const dataRows = hasHeader ? grid.slice(1) : grid;

  if (dataRows.length < CSV_MIN_ROWS) {
    return {
      ok: false,
      error: `Need at least ${CSV_MIN_ROWS} data rows; found ${dataRows.length}.`,
    };
  }
  if (dataRows.length > CSV_MAX_ROWS) {
    return {
      ok: false,
      error: `Too many rows (${dataRows.length}); the limit is ${CSV_MAX_ROWS}.`,
    };
  }

  const featureNames = featureCols.map((c) =>
    header && header[c].trim() !== '' ? header[c].trim() : `x${featureCols.indexOf(c) + 1}`,
  );

  // Build the numeric feature matrix, validating every cell.
  const X: number[][] = [];
  for (let r = 0; r < dataRows.length; r += 1) {
    const rowOut: number[] = [];
    for (const c of featureCols) {
      const n = parseNumericCell(dataRows[r][c]);
      if (n === null) {
        const colName = header ? `“${header[c].trim() || `column ${c + 1}`}”` : `column ${c + 1}`;
        return {
          ok: false,
          error: `Non-numeric value ${JSON.stringify(dataRows[r][c])} in ${colName}, data row ${r + 1}.`,
        };
      }
      rowOut.push(n);
    }
    X.push(rowOut);
  }

  // Labels.
  let y: number[] | null = null;
  let classNames: string[] | undefined;
  if (labelCol !== null) {
    const rawLabels = dataRows.map((row) => row[labelCol].trim());
    if (options.task === 'regression') {
      const nums: number[] = [];
      for (let r = 0; r < rawLabels.length; r += 1) {
        const n = parseNumericCell(rawLabels[r]);
        if (n === null) {
          return {
            ok: false,
            error: `Regression target must be numeric; got ${JSON.stringify(rawLabels[r])} on data row ${r + 1}.`,
          };
        }
        nums.push(n);
      }
      y = nums;
    } else {
      // Classification: encode distinct labels in first-seen order.
      const order: string[] = [];
      const index = new Map<string, number>();
      for (const label of rawLabels) {
        if (!index.has(label)) {
          index.set(label, order.length);
          order.push(label);
        }
      }
      if (order.length < 2) {
        return { ok: false, error: 'Classification needs at least 2 distinct labels.' };
      }
      y = rawLabels.map((label) => index.get(label)!);
      classNames = order;
    }
  }

  const dataset: Dataset = {
    id: options.id,
    name: options.name,
    description:
      options.description ??
      `Uploaded CSV · ${X.length} rows × ${featureNames.length} features`,
    X,
    y,
    featureNames,
    task: options.task,
    source: 'BYO',
    ...(classNames ? { classNames } : {}),
  };
  return { ok: true, dataset };
}
