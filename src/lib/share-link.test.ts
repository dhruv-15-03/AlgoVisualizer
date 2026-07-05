import { describe, it, expect } from 'vitest';
import {
  encodeShareState,
  decodeShareState,
  buildShareUrl,
  readTokenFromHash,
  SHARE_LINK_VERSION,
  MAX_SHARE_TOKEN_LENGTH,
  type WorkspaceShareState,
} from '@/lib/share-link';
import type { Dataset } from '@/types/dataset';

const base: WorkspaceShareState = {
  algorithmId: 'kmeans',
  code: 'def run(X, k=3):\n    yield {}',
  hyperparams: { k: 3, max_iter: 20, mode: 'auto', warm: true },
  datasetId: 'blobs',
};

describe('share-link · round-trip', () => {
  it('encodes then decodes back to the same state', () => {
    const token = encodeShareState(base);
    expect(typeof token).toBe('string');
    expect(decodeShareState(token)).toEqual(base);
  });

  it('produces a URL-safe token (no +, /, or = padding)', () => {
    const token = encodeShareState({
      ...base,
      code: '🙂 weights = np.zeros((3, 2))  # unicode + symbols /=',
    });
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('preserves non-ASCII code via UTF-8', () => {
    const state = { ...base, code: 'x = "héllo · 世界 · café"' };
    expect(decodeShareState(encodeShareState(state))?.code).toBe(state.code);
  });

  it('preserves an embedded custom dataset', () => {
    const customDataset: Dataset = {
      id: 'custom:1',
      name: 'My points',
      description: 'drawn',
      X: [
        [0, 0],
        [1, 1],
      ],
      y: [0, 1],
      featureNames: ['x', 'y'],
      task: 'classification',
      source: 'BYO',
    };
    const state: WorkspaceShareState = { ...base, datasetId: customDataset.id, customDataset };
    const decoded = decodeShareState(encodeShareState(state));
    expect(decoded?.customDataset).toEqual(customDataset);
  });
});

describe('share-link · version field', () => {
  it('embeds the current version', () => {
    expect(SHARE_LINK_VERSION).toBe(1);
  });

  it('rejects a token from a different schema version', () => {
    // Hand-craft a payload with a bogus version.
    const json = JSON.stringify({ v: 999, a: 'kmeans', c: '', h: {}, d: 'blobs' });
    const b64 = btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(decodeShareState(b64)).toBeNull();
  });
});

describe('share-link · graceful fallback', () => {
  it('returns null for empty / non-string input', () => {
    expect(decodeShareState('')).toBeNull();
    // @ts-expect-error — exercising runtime robustness
    expect(decodeShareState(null)).toBeNull();
  });

  it('returns null for non-base64url characters', () => {
    expect(decodeShareState('not valid !@#$%')).toBeNull();
  });

  it('returns null for base64 that is not JSON', () => {
    const b64 = btoa('this is not json').replace(/=+$/, '');
    expect(decodeShareState(b64)).toBeNull();
  });

  it('returns null when required fields are missing or wrong-typed', () => {
    const mk = (obj: unknown) =>
      btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(decodeShareState(mk({ v: 1, a: 'kmeans', c: '', d: 'blobs' }))).toBeNull(); // no h
    expect(decodeShareState(mk({ v: 1, a: '', c: '', h: {}, d: 'blobs' }))).toBeNull(); // empty algo
    expect(decodeShareState(mk({ v: 1, a: 'k', c: 1, h: {}, d: 'blobs' }))).toBeNull(); // code not string
    expect(decodeShareState(mk({ v: 1, a: 'k', c: '', h: { bad: {} }, d: 'b' }))).toBeNull(); // bad hp value
  });

  it('rejects an invalid embedded dataset', () => {
    const mk = (obj: unknown) =>
      btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(
      decodeShareState(mk({ v: 1, a: 'k', c: '', h: {}, d: 'c', x: { id: 'c', X: 'nope' } })),
    ).toBeNull();
  });

  it('returns null for an oversized token', () => {
    const huge = 'A'.repeat(MAX_SHARE_TOKEN_LENGTH + 1);
    expect(decodeShareState(huge)).toBeNull();
  });

  it('handles large payloads without throwing (long but valid)', () => {
    const big = { ...base, code: 'x = 1\n'.repeat(5000) };
    const token = encodeShareState(big);
    expect(decodeShareState(token)).toEqual(big);
  });
});

describe('share-link · dataset validation', () => {
  const mk = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const wrap = (x: unknown) => mk({ v: 1, a: 'kmeans', c: '', h: {}, d: 'c', x });

  it('rejects an empty feature matrix', () => {
    expect(
      decodeShareState(wrap({ id: 'c', name: 'c', X: [], y: null, task: 'clustering' })),
    ).toBeNull();
  });

  it('rejects ragged rows (inconsistent feature width)', () => {
    expect(
      decodeShareState(
        wrap({
          id: 'c',
          name: 'c',
          X: [
            [0, 0],
            [1],
          ],
          y: null,
          task: 'clustering',
        }),
      ),
    ).toBeNull();
  });

  it('rejects a label vector whose length does not match X', () => {
    expect(
      decodeShareState(
        wrap({
          id: 'c',
          name: 'c',
          X: [
            [0, 0],
            [1, 1],
          ],
          y: [0],
          task: 'classification',
        }),
      ),
    ).toBeNull();
  });

  it('accepts a clean unlabelled (clustering) dataset', () => {
    const x = {
      id: 'c',
      name: 'pts',
      X: [
        [0, 0],
        [1, 1],
      ],
      y: null,
      task: 'clustering',
    };
    expect(decodeShareState(wrap(x))?.customDataset?.id).toBe('c');
  });
});

describe('share-link · URL helpers', () => {
  it('builds a hash-based share URL', () => {
    const url = buildShareUrl('TOKEN', { origin: 'https://x.dev', pathname: '/workspace/kmeans' });
    expect(url).toBe('https://x.dev/workspace/kmeans#s=TOKEN');
  });

  it('reads a token back out of a hash', () => {
    expect(readTokenFromHash('#s=TOKEN')).toBe('TOKEN');
    expect(readTokenFromHash('s=TOKEN')).toBe('TOKEN');
  });

  it('returns null when the hash has no token', () => {
    expect(readTokenFromHash('')).toBeNull();
    expect(readTokenFromHash('#')).toBeNull();
    expect(readTokenFromHash('#other=1')).toBeNull();
  });

  it('round-trips through a built URL hash', () => {
    const token = encodeShareState(base);
    const url = buildShareUrl(token, { origin: 'https://x.dev', pathname: '/workspace/kmeans' });
    const hash = '#' + url.split('#')[1];
    const recovered = readTokenFromHash(hash);
    expect(recovered).toBe(token);
    expect(decodeShareState(recovered!)).toEqual(base);
  });
});
