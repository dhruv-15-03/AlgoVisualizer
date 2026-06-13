import { describe, it, expect } from 'vitest';
import { extractValue, patchCode, findLine } from '@/lib/code-binding';

describe('code-binding · extractValue', () => {
  it('reads an integer from a def signature', () => {
    expect(extractValue('def run(X, k=3):', 'k=')).toBe(3);
  });

  it('reads a float', () => {
    expect(extractValue('lr=0.01', 'lr=')).toBe(0.01);
  });

  it('reads a negative number', () => {
    expect(extractValue('intercept=-2.5', 'intercept=')).toBe(-2.5);
  });

  it('reads scientific notation', () => {
    expect(extractValue('tol=1e-4', 'tol=')).toBe(0.0001);
    expect(extractValue('big=1.5e3', 'big=')).toBe(1500);
  });

  it('tolerates whitespace around "=" (key = value)', () => {
    expect(extractValue('k = 5', 'k=')).toBe(5);
    expect(extractValue('k= 5', 'k=')).toBe(5);
    expect(extractValue('k =5', 'k=')).toBe(5);
  });

  it('tolerates surrounding whitespace on the line', () => {
    expect(extractValue('    k = 7    ', 'k=')).toBe(7);
  });

  it('reads a value nested inside a function call', () => {
    const code = 'model = KMeans(n_clusters=3, random_state=0, n_init=10)';
    expect(extractValue(code, 'n_clusters=')).toBe(3);
    expect(extractValue(code, 'random_state=')).toBe(0);
    expect(extractValue(code, 'n_init=')).toBe(10);
  });

  it('reads booleans (Python and JSON casing)', () => {
    expect(extractValue('fit_intercept=True', 'fit_intercept=')).toBe(true);
    expect(extractValue('warm=False', 'warm=')).toBe(false);
    expect(extractValue('flag=true', 'flag=')).toBe(true);
    expect(extractValue('flag=false', 'flag=')).toBe(false);
  });

  it('reads quoted strings (single and double quotes)', () => {
    expect(extractValue("kernel='rbf'", 'kernel=')).toBe('rbf');
    expect(extractValue('mode="auto"', 'mode=')).toBe('auto');
  });

  it('returns null when the key is missing', () => {
    expect(extractValue('k=3', 'bar=')).toBeNull();
    expect(extractValue('', 'k=')).toBeNull();
  });

  it('respects word boundaries (does not match a key that is a suffix of another)', () => {
    // "rank=5" must NOT satisfy a request for "k=".
    expect(extractValue('rank=5\nk=3', 'k=')).toBe(3);
  });

  it('ignores a trailing inline comment on the same line', () => {
    expect(extractValue('k=3  # was k=9 before', 'k=')).toBe(3);
  });

  it('ignores a hyperparameter mentioned in a comment above the real assignment', () => {
    // Previously a latent binding bug: the commented `k=9` shadowed the real
    // `k=3` because the first regex match anywhere won. Comments are now
    // stripped before matching, so the real assignment wins.
    const code = '# good starting point: k=9\ndef run(X, k=3):';
    expect(extractValue(code, 'k=')).toBe(3);
  });

  it('ignores a fully commented-out assignment', () => {
    expect(extractValue('# k = 99\nk = 3', 'k=')).toBe(3);
    // ...and returns null when the only occurrence is commented out.
    expect(extractValue('# k = 99', 'k=')).toBeNull();
  });

  it('does not treat a "#" inside a string literal as a comment', () => {
    // The "#" lives inside the quoted value; stripping must leave the string
    // intact so the value still resolves (rather than being blanked out).
    expect(extractValue('mode="#fff"', 'mode=')).toBe('#fff');
    expect(extractValue("color='#abc' # real comment\nk=3", 'color=')).toBe('#abc');
  });
});

describe('code-binding · patchCode', () => {
  it('patches an integer in place', () => {
    expect(patchCode('k=3', 'k=', 5)).toBe('k=5');
  });

  it('preserves the original spacing around "="', () => {
    expect(patchCode('k = 3', 'k=', 5)).toBe('k = 5');
  });

  it('patches a float', () => {
    expect(patchCode('lr=0.01', 'lr=', 0.1)).toBe('lr=0.1');
  });

  it('formats integers without a trailing decimal', () => {
    expect(patchCode('k=3', 'k=', 4)).toBe('k=4');
  });

  it('patches booleans to Python casing', () => {
    expect(patchCode('flag=True', 'flag=', false)).toBe('flag=False');
    expect(patchCode('flag=False', 'flag=', true)).toBe('flag=True');
  });

  it('returns the code unchanged when the key is missing', () => {
    expect(patchCode('k=3', 'bar=', 5)).toBe('k=3');
  });

  it('only patches the first occurrence', () => {
    expect(patchCode('k=3\nk=3', 'k=', 9)).toBe('k=9\nk=3');
  });

  it('patches the real assignment, not a value mentioned in a comment above it', () => {
    const code = '# try k=9\nk=3';
    expect(patchCode(code, 'k=', 5)).toBe('# try k=9\nk=5');
  });

  it('patches a value inside a function call without touching siblings', () => {
    const code = 'KMeans(n_clusters=3, random_state=0)';
    expect(patchCode(code, 'n_clusters=', 8)).toBe('KMeans(n_clusters=8, random_state=0)');
  });
});

describe('code-binding · findLine', () => {
  it('returns the 1-based line number of the key', () => {
    expect(findLine('a=1\nk=3\nb=2', 'k=')).toBe(2);
  });

  it('returns null when the key is absent', () => {
    expect(findLine('a=1\nb=2', 'k=')).toBeNull();
  });

  it('returns the first matching line', () => {
    expect(findLine('x=1\nk=3\nk=4', 'k=')).toBe(2);
  });
});

describe('code-binding · CodePanel round-trip', () => {
  // Mirrors CodePanel.handleChange: when code changes, each hyperparam is
  // re-extracted and pushed to the store. This is the riskiest real-world path.
  const signature = 'def run(X, y=None, k=3, max_iter=20, seed=0, tol=1e-4):';

  it('extracts every hyperparam from a realistic def signature', () => {
    expect(extractValue(signature, 'k=')).toBe(3);
    expect(extractValue(signature, 'max_iter=')).toBe(20);
    expect(extractValue(signature, 'seed=')).toBe(0);
    expect(extractValue(signature, 'tol=')).toBe(0.0001);
  });

  it('patching one hyperparam leaves the others extractable and unchanged', () => {
    const patched = patchCode(signature, 'k=', 5);
    expect(extractValue(patched, 'k=')).toBe(5);
    expect(extractValue(patched, 'max_iter=')).toBe(20);
    expect(extractValue(patched, 'seed=')).toBe(0);
  });

  it('survives a patch → extract → patch cycle (slider then code edit)', () => {
    let code = signature;
    code = patchCode(code, 'max_iter=', 50);
    expect(extractValue(code, 'max_iter=')).toBe(50);
    code = patchCode(code, 'max_iter=', 35);
    expect(extractValue(code, 'max_iter=')).toBe(35);
    // The neighbouring keys are still intact.
    expect(extractValue(code, 'k=')).toBe(3);
    expect(extractValue(code, 'seed=')).toBe(0);
  });
});
