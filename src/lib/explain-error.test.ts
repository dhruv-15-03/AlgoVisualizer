import { describe, it, expect } from 'vitest';
import { explainError, extractExceptionLine } from '@/lib/explain-error';

const tb = (...lines: string[]) =>
  ['Traceback (most recent call last):', '  File "<exec>", line 3, in run', ...lines].join('\n');

describe('explain-error · extractExceptionLine', () => {
  it('pulls the final exception type + message', () => {
    expect(extractExceptionLine(tb("NameError: name 'np' is not defined"))).toEqual({
      type: 'NameError',
      message: "name 'np' is not defined",
    });
  });

  it('strips a dotted module prefix from the type', () => {
    expect(extractExceptionLine('numpy.linalg.LinAlgError: Singular matrix')).toEqual({
      type: 'LinAlgError',
      message: 'Singular matrix',
    });
  });

  it('returns null when there is no exception line', () => {
    expect(extractExceptionLine('just some text\nwith no error')).toBeNull();
  });
});

describe('explain-error · category mapping', () => {
  it('maps NameError', () => {
    const r = explainError(tb("NameError: name 'np' is not defined"));
    expect(r.category).toBe('NameError');
    expect(r.title).toContain('np');
    expect(r.suggestions.length).toBeGreaterThan(0);
    expect(r.raw).toContain('NameError');
  });

  it('maps SyntaxError', () => {
    const r = explainError('  File "<exec>", line 2\n    def run(X\n            ^\nSyntaxError: invalid syntax');
    expect(r.category).toBe('SyntaxError');
    expect(r.suggestions.join(' ')).toMatch(/colon|bracket|quote/i);
  });

  it('maps IndentationError (not SyntaxError, even though it is a subclass)', () => {
    const r = explainError(tb('IndentationError: unexpected indent'));
    expect(r.category).toBe('IndentationError');
  });

  it('maps a mixed tabs/spaces TabError to the indentation category', () => {
    const r = explainError(tb('TabError: inconsistent use of tabs and spaces in indentation'));
    expect(r.category).toBe('IndentationError');
  });

  it('maps a ValueError shape mismatch to ShapeMismatch', () => {
    const r = explainError(
      tb('ValueError: shapes (3,2) and (3,3) not aligned: 2 (dim 1) != 3 (dim 0)'),
    );
    expect(r.category).toBe('ShapeMismatch');
    expect(r.title).toMatch(/shape/i);
  });

  it('maps a generic ValueError that is not about shapes', () => {
    const r = explainError(tb('ValueError: math domain error'));
    expect(r.category).toBe('ValueError');
  });

  it('maps ZeroDivisionError', () => {
    const r = explainError(tb('ZeroDivisionError: division by zero'));
    expect(r.category).toBe('ZeroDivisionError');
    expect(r.suggestions.join(' ')).toMatch(/epsilon|denominator|1e-8/i);
  });

  it('maps ModuleNotFoundError and names the module', () => {
    const r = explainError(tb("ModuleNotFoundError: No module named 'sklearn'"));
    expect(r.category).toBe('ModuleNotFoundError');
    expect(r.title).toContain('sklearn');
  });

  it('maps a NaN / overflow warning to Convergence', () => {
    const r = explainError(
      'RuntimeWarning: overflow encountered in exp\n  result = np.exp(z)\nweights became nan',
    );
    expect(r.category).toBe('Convergence');
    expect(r.suggestions.join(' ')).toMatch(/learning rate|normaliz|standardiz/i);
  });

  it('maps an explicit "did not converge" message to Convergence', () => {
    const r = explainError(tb('ValueError: Solver did not converge'));
    expect(r.category).toBe('Convergence');
  });

  it('maps the safety-limit message to Timeout', () => {
    const r = explainError('Run exceeded 5000 events limit');
    expect(r.category).toBe('Timeout');
    expect(r.title).toMatch(/safety limit/i);
  });

  it('maps TypeError', () => {
    const r = explainError(tb("TypeError: 'NoneType' object is not subscriptable"));
    expect(r.category).toBe('TypeError');
  });

  it('maps IndexError', () => {
    const r = explainError(tb('IndexError: index 5 is out of bounds for axis 0 with size 3'));
    expect(r.category).toBe('IndexError');
  });

  it('maps KeyError', () => {
    const r = explainError(tb("KeyError: 'learning_rate'"));
    expect(r.category).toBe('KeyError');
  });

  it('maps AttributeError', () => {
    const r = explainError(tb("AttributeError: 'numpy.ndarray' object has no attribute 'fit'"));
    expect(r.category).toBe('AttributeError');
  });

  it('falls back to Unknown for an unrecognized exception, keeping the raw', () => {
    const raw = tb('LinAlgError: Singular matrix');
    const r = explainError(raw);
    expect(r.category).toBe('Unknown');
    expect(r.raw).toBe(raw);
    expect(r.suggestions.length).toBeGreaterThan(0);
  });

  it('is total: handles empty / null input without throwing', () => {
    expect(explainError('').category).toBe('Unknown');
    expect(explainError(null).category).toBe('Unknown');
    expect(explainError(undefined).raw).toBe('');
  });
});
