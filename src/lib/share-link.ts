/**
 * Share / permalink encoding for a workspace session.
 *
 * Captures the parts of a session a learner would want to send to someone
 * else — the chosen algorithm, their edited Python, the hyperparameters, and
 * the active dataset (including a bring-your-own custom dataset) — and packs
 * them into a single compact, URL-safe token.
 *
 * Format: `JSON → UTF-8 → base64url`. A leading `version` field makes the
 * payload forward-compatible: a future revision can bump it (e.g. to add a
 * compressed variant) while older readers reject what they don't understand
 * instead of mis-parsing it. Decoding is total — any malformed, truncated, or
 * oversized input yields `null` rather than throwing.
 *
 * Note on size: the token grows with the code and (especially) a custom
 * dataset's point count, so very large inputs produce long URLs. Built-in
 * datasets are referenced by id and cost nothing; only an uploaded/drawn
 * dataset is embedded in full.
 */

import type { Dataset } from '@/types/dataset';

/** Current payload schema version. Bump when the shape changes incompatibly. */
export const SHARE_LINK_VERSION = 1;

/**
 * Hard ceiling for what `decodeShareState` will attempt to parse. Guards
 * against a pathologically large token wedged into the URL. Encoding does not
 * enforce this — it always produces a valid token — but anything beyond this
 * on the way back in is treated as untrusted junk and rejected.
 */
export const MAX_SHARE_TOKEN_LENGTH = 200_000;

/**
 * Soft budget for a comfortable URL length. Tokens beyond this still work but
 * may bump against proxy/browser URL limits; callers can warn the user.
 */
export const RECOMMENDED_MAX_SHARE_TOKEN_LENGTH = 8_000;

export interface WorkspaceShareState {
  algorithmId: string;
  code: string;
  hyperparams: Record<string, number | string | boolean>;
  datasetId: string;
  /** Present only when the active dataset is a user-supplied (BYO) dataset. */
  customDataset?: Dataset;
}

/** Compact on-the-wire shape — short keys keep the token small. */
interface SharePayload {
  v: number;
  a: string;
  c: string;
  h: Record<string, number | string | boolean>;
  d: string;
  x?: Dataset;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  const b64 = btoa(binary);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(token: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(token)) return null;
  let b64 = token.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  if (pad === 1) return null; // not a valid base64 length
  if (pad > 0) b64 += '='.repeat(4 - pad);
  let binary: string;
  try {
    binary = atob(b64);
  } catch {
    return null;
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Pack a workspace state into a single URL-safe token. */
export function encodeShareState(state: WorkspaceShareState): string {
  const payload: SharePayload = {
    v: SHARE_LINK_VERSION,
    a: state.algorithmId,
    c: state.code,
    h: state.hyperparams ?? {},
    d: state.datasetId,
  };
  if (state.customDataset) payload.x = state.customDataset;
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  return toBase64Url(bytes);
}

function isPlainRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isValidHyperparams(v: unknown): v is Record<string, number | string | boolean> {
  if (!isPlainRecord(v)) return false;
  return Object.values(v).every(
    (x) => typeof x === 'number' || typeof x === 'string' || typeof x === 'boolean',
  );
}

/**
 * Recover a workspace state from a token, or `null` if it is malformed,
 * truncated, oversized, or from an unknown/future schema version.
 */
export function decodeShareState(token: string): WorkspaceShareState | null {
  if (typeof token !== 'string' || token.length === 0) return null;
  if (token.length > MAX_SHARE_TOKEN_LENGTH) return null;

  const bytes = fromBase64Url(token);
  if (!bytes) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }

  if (!isPlainRecord(parsed)) return null;
  const p = parsed as Partial<SharePayload>;

  if (p.v !== SHARE_LINK_VERSION) return null;
  if (typeof p.a !== 'string' || p.a.length === 0) return null;
  if (typeof p.c !== 'string') return null;
  if (typeof p.d !== 'string' || p.d.length === 0) return null;
  if (!isValidHyperparams(p.h)) return null;

  const state: WorkspaceShareState = {
    algorithmId: p.a,
    code: p.c,
    hyperparams: p.h,
    datasetId: p.d,
  };
  if (p.x !== undefined) {
    if (!isValidDataset(p.x)) return null;
    state.customDataset = p.x as Dataset;
  }
  return state;
}

function isValidDataset(v: unknown): boolean {
  if (!isPlainRecord(v)) return false;
  const d = v as Record<string, unknown>;
  if (typeof d.id !== 'string' || d.id.length === 0) return false;
  if (typeof d.name !== 'string') return false;
  if (!Array.isArray(d.X) || d.X.length === 0) return false;
  // Every sample must be a non-empty numeric vector of the SAME width, and
  // every value must be finite. Rejecting NaN/Infinity + ragged/empty rows
  // here stops a malformed share link or BYO import from feeding garbage into
  // an algorithm (which would either crash the worker or silently produce
  // nonsense) — the decoder falls back to defaults instead.
  const width = Array.isArray(d.X[0]) ? (d.X[0] as unknown[]).length : 0;
  if (width === 0) return false;
  const isFiniteNumber = (n: unknown): boolean => typeof n === 'number' && Number.isFinite(n);
  const rowsOk = d.X.every(
    (row) => Array.isArray(row) && row.length === width && row.every(isFiniteNumber),
  );
  if (!rowsOk) return false;
  if (d.y !== null) {
    if (!Array.isArray(d.y)) return false;
    if (d.y.length !== d.X.length) return false;
    if (!(d.y as unknown[]).every(isFiniteNumber)) return false;
  }
  if (d.task !== 'classification' && d.task !== 'regression' && d.task !== 'clustering') return false;
  return true;
}

/** Build a full shareable URL from a token, using the current origin/path. */
export function buildShareUrl(token: string, base?: { origin: string; pathname: string }): string {
  const origin = base?.origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  const pathname = base?.pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
  return `${origin}${pathname}#s=${token}`;
}

/** Extract a share token from a URL hash like `#s=…` (or `#…`). Returns null if absent. */
export function readTokenFromHash(hash: string): string | null {
  if (!hash) return null;
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  const fromParam = params.get('s');
  if (fromParam) return fromParam;
  return null;
}
