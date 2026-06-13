import { describe, it, expect } from 'vitest';
import {
  tokenizeCsv,
  parseNumericCell,
  csvToDataset,
  CSV_MAX_COLS,
  CSV_MIN_ROWS,
} from '@/lib/csv-dataset';

describe('csv-dataset · tokenizeCsv', () => {
  it('splits a simple grid', () => {
    expect(tokenizeCsv('a,b\n1,2\n3,4')).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('handles quoted fields with embedded commas', () => {
    expect(tokenizeCsv('"a,b",c\n1,2')).toEqual([
      ['a,b', 'c'],
      ['1', '2'],
    ]);
  });

  it('handles escaped double-quotes', () => {
    expect(tokenizeCsv('"she said ""hi""",2')).toEqual([['she said "hi"', '2']]);
  });

  it('normalizes CRLF and ignores a trailing newline', () => {
    expect(tokenizeCsv('1,2\r\n3,4\r\n')).toEqual([
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('drops fully blank lines', () => {
    expect(tokenizeCsv('1,2\n\n3,4')).toEqual([
      ['1', '2'],
      ['3', '4'],
    ]);
  });
});

describe('csv-dataset · parseNumericCell', () => {
  it('accepts ints, floats, negatives, and scientific notation', () => {
    expect(parseNumericCell('3')).toBe(3);
    expect(parseNumericCell('-2.5')).toBe(-2.5);
    expect(parseNumericCell('.5')).toBe(0.5);
    expect(parseNumericCell('1e3')).toBe(1000);
    expect(parseNumericCell('  4.2 ')).toBe(4.2);
  });

  it('rejects empty, text, Infinity, and hex', () => {
    expect(parseNumericCell('')).toBeNull();
    expect(parseNumericCell('cat')).toBeNull();
    expect(parseNumericCell('Infinity')).toBeNull();
    expect(parseNumericCell('0x10')).toBeNull();
    expect(parseNumericCell('1,000')).toBeNull();
  });
});

const cls = ['f1,f2,label', '1,2,a', '3,4,b', '5,6,a', '7,8,b', '9,10,a'].join('\n');

describe('csv-dataset · csvToDataset classification', () => {
  it('encodes categorical labels and reads feature names from the header', () => {
    const r = csvToDataset(cls, { id: 'c1', name: 'c', task: 'classification', labelColumn: 'last' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dataset.featureNames).toEqual(['f1', 'f2']);
    expect(r.dataset.X[0]).toEqual([1, 2]);
    expect(r.dataset.classNames).toEqual(['a', 'b']);
    expect(r.dataset.y).toEqual([0, 1, 0, 1, 0]);
    expect(r.dataset.source).toBe('BYO');
    expect(r.dataset.task).toBe('classification');
  });

  it('rejects a single-class classification target', () => {
    const data = ['f1,f2,label', '1,2,a', '3,4,a', '5,6,a', '7,8,a'].join('\n');
    const r = csvToDataset(data, { id: 'c', name: 'c', task: 'classification' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/2 distinct/i);
  });
});

describe('csv-dataset · csvToDataset regression', () => {
  it('keeps a numeric target', () => {
    const data = ['x,y', '1,10', '2,20', '3,30', '4,40'].join('\n');
    const r = csvToDataset(data, { id: 'r', name: 'r', task: 'regression', labelColumn: 'last' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dataset.y).toEqual([10, 20, 30, 40]);
    expect(r.dataset.featureNames).toEqual(['x']);
  });

  it('rejects a non-numeric regression target', () => {
    const data = ['x,y', '1,low', '2,high', '3,low', '4,high'].join('\n');
    const r = csvToDataset(data, { id: 'r', name: 'r', task: 'regression' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/numeric/i);
  });
});

describe('csv-dataset · csvToDataset clustering', () => {
  it('uses all columns as features and leaves y null', () => {
    const data = ['1,2', '3,4', '5,6', '7,8'].join('\n');
    const r = csvToDataset(data, { id: 'k', name: 'k', task: 'clustering' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dataset.y).toBeNull();
    expect(r.dataset.featureNames).toEqual(['x1', 'x2']);
    expect(r.dataset.X.length).toBe(4);
  });
});

describe('csv-dataset · header detection', () => {
  it('auto-detects no header when the first row is fully numeric', () => {
    const data = ['1,2,0', '3,4,1', '5,6,0', '7,8,1'].join('\n');
    const r = csvToDataset(data, { id: 'd', name: 'd', task: 'classification', labelColumn: 'last' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dataset.featureNames).toEqual(['x1', 'x2']);
    expect(r.dataset.X.length).toBe(4);
  });

  it('respects an explicit hasHeader:false', () => {
    const data = ['1,2', '3,4', '5,6', '7,8'].join('\n');
    const r = csvToDataset(data, {
      id: 'd',
      name: 'd',
      task: 'clustering',
      hasHeader: false,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dataset.X.length).toBe(4);
  });
});

describe('csv-dataset · validation errors', () => {
  it('errors on empty input', () => {
    expect(csvToDataset('', { id: 'd', name: 'd', task: 'clustering' })).toEqual({
      ok: false,
      error: 'The file is empty.',
    });
  });

  it('errors on inconsistent column counts', () => {
    const data = ['1,2,3', '4,5', '6,7,8', '9,10,11'].join('\n');
    const r = csvToDataset(data, { id: 'd', name: 'd', task: 'clustering' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/columns but expected/i);
  });

  it('errors on too few data rows', () => {
    const data = ['1,2', '3,4'].join('\n');
    const r = csvToDataset(data, { id: 'd', name: 'd', task: 'clustering' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain(`at least ${CSV_MIN_ROWS}`);
  });

  it('errors on a non-numeric feature cell', () => {
    const data = ['a,b', '1,2', '3,oops', '5,6', '7,8'].join('\n');
    const r = csvToDataset(data, { id: 'd', name: 'd', task: 'clustering' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/non-numeric/i);
  });

  it('errors when there are too many columns', () => {
    const wide = Array.from({ length: CSV_MAX_COLS + 1 }, (_, i) => i).join(',');
    const data = [wide, wide, wide, wide].join('\n');
    const r = csvToDataset(data, { id: 'd', name: 'd', task: 'clustering' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/too many columns/i);
  });
});
