import { describe, it, expect } from 'vitest';
import {
  pyodideLoadProgress,
  isPyodideStage,
  PYODIDE_STAGE_ORDER,
  type PyodideStage,
} from './pyodide-progress';

describe('isPyodideStage', () => {
  it('accepts every known stage', () => {
    for (const s of ['idle', 'loading-runtime', 'loading-numpy', 'ready', 'error'] as const) {
      expect(isPyodideStage(s)).toBe(true);
    }
  });

  it('rejects unknown values', () => {
    expect(isPyodideStage('loading')).toBe(false);
    expect(isPyodideStage('')).toBe(false);
    expect(isPyodideStage(undefined)).toBe(false);
    expect(isPyodideStage(42)).toBe(false);
  });
});

describe('pyodideLoadProgress', () => {
  it('reports increasing percent along the happy path', () => {
    const percents = PYODIDE_STAGE_ORDER.map((s) => pyodideLoadProgress(s).percent);
    const sorted = [...percents].sort((a, b) => a - b);
    expect(percents).toEqual(sorted);
    expect(percents[0]).toBe(0);
    expect(percents[percents.length - 1]).toBe(100);
  });

  it('marks intermediate stages active and terminal stages inactive', () => {
    expect(pyodideLoadProgress('loading-runtime').active).toBe(true);
    expect(pyodideLoadProgress('loading-numpy').active).toBe(true);
    expect(pyodideLoadProgress('ready').active).toBe(false);
    expect(pyodideLoadProgress('error').active).toBe(false);
  });

  it('uses friendly staged labels', () => {
    expect(pyodideLoadProgress('loading-runtime').label).toMatch(/python/i);
    expect(pyodideLoadProgress('loading-numpy').label).toMatch(/numpy/i);
    expect(pyodideLoadProgress('ready').label).toMatch(/ready/i);
  });

  it('pins error at 100% but inactive', () => {
    const info = pyodideLoadProgress('error');
    expect(info.percent).toBe(100);
    expect(info.active).toBe(false);
  });

  it('falls back to idle for malformed input', () => {
    const info = pyodideLoadProgress('nonsense' as PyodideStage);
    expect(info.stage).toBe('idle');
    expect(info.percent).toBe(0);
  });
});
