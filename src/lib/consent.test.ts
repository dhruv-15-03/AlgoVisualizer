import { describe, it, expect, beforeEach } from 'vitest';
import {
  getConsent,
  setConsent,
  hasAccepted,
  maybeLoadClarity,
  loadClarity,
  CONSENT_STORAGE_KEY,
} from './consent';

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  } as Storage;
}

describe('consent persistence', () => {
  let store: Storage;
  beforeEach(() => {
    store = memoryStorage();
  });

  it('returns null when undecided', () => {
    expect(getConsent(store)).toBeNull();
    expect(hasAccepted(store)).toBe(false);
  });

  it('round-trips an accepted choice', () => {
    setConsent('accepted', store);
    expect(store.getItem(CONSENT_STORAGE_KEY)).toBe('accepted');
    expect(getConsent(store)).toBe('accepted');
    expect(hasAccepted(store)).toBe(true);
  });

  it('round-trips a declined choice', () => {
    setConsent('declined', store);
    expect(getConsent(store)).toBe('declined');
    expect(hasAccepted(store)).toBe(false);
  });

  it('treats unknown stored values as undecided', () => {
    store.setItem(CONSENT_STORAGE_KEY, 'maybe');
    expect(getConsent(store)).toBeNull();
  });

  it('tolerates a throwing storage', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    } as unknown as Storage;
    expect(() => setConsent('accepted', broken)).not.toThrow();
    expect(getConsent(broken)).toBeNull();
    expect(hasAccepted(broken)).toBe(false);
  });
});

describe('maybeLoadClarity', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    delete (window as { clarity?: unknown }).clarity;
  });

  it('does not inject when not accepted', () => {
    const store = memoryStorage();
    expect(maybeLoadClarity(store)).toBe(false);
    expect(document.getElementById('clarity-tag')).toBeNull();
    expect((window as { clarity?: unknown }).clarity).toBeUndefined();
  });

  it('injects exactly once when accepted', () => {
    const store = memoryStorage();
    setConsent('accepted', store);
    // Need at least one existing script for the insertBefore path.
    document.head.appendChild(document.createElement('script'));

    expect(maybeLoadClarity(store)).toBe(true);
    const tag = document.getElementById('clarity-tag') as HTMLScriptElement | null;
    expect(tag).not.toBeNull();
    expect(tag?.src).toContain('clarity.ms/tag/');

    // Second call is a no-op (still a single tag).
    maybeLoadClarity(store);
    expect(document.querySelectorAll('#clarity-tag').length).toBe(1);
  });

  it('loadClarity queues commands via the global stub', () => {
    document.head.appendChild(document.createElement('script'));
    loadClarity('test-project');
    const w = window as { clarity?: ((...a: unknown[]) => void) & { q?: unknown[] } };
    expect(typeof w.clarity).toBe('function');
    w.clarity?.('event', 'x');
    expect(w.clarity?.q?.length).toBeGreaterThan(0);
  });
});
