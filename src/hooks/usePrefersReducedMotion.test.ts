import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

type ChangeHandler = (e: MediaQueryListEvent) => void;

/** Install a controllable matchMedia mock; returns a setter to flip the match. */
function mockMatchMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<ChangeHandler>();
  const mql = {
    get matches() {
      return matches;
    },
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: (_: 'change', cb: ChangeHandler) => listeners.add(cb),
    removeEventListener: (_: 'change', cb: ChangeHandler) => listeners.delete(cb),
    // Legacy API — present but unused.
    addListener: (cb: ChangeHandler) => listeners.add(cb),
    removeListener: (cb: ChangeHandler) => listeners.delete(cb),
    dispatchEvent: () => true,
    onchange: null,
  };
  const matchMedia = vi.fn().mockReturnValue(mql);
  vi.stubGlobal('matchMedia', matchMedia);
  return {
    set(next: boolean) {
      matches = next;
      listeners.forEach((cb) => cb({ matches: next } as MediaQueryListEvent));
    },
    listenerCount: () => listeners.size,
  };
}

describe('usePrefersReducedMotion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns false when reduce-motion is not set', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it('returns true when reduce-motion is set', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });

  it('reacts to the OS setting changing', () => {
    const ctl = mockMatchMedia(false);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
    act(() => ctl.set(true));
    expect(result.current).toBe(true);
    act(() => ctl.set(false));
    expect(result.current).toBe(false);
  });

  it('removes its listener on unmount', () => {
    const ctl = mockMatchMedia(false);
    const { unmount } = renderHook(() => usePrefersReducedMotion());
    expect(ctl.listenerCount()).toBe(1);
    unmount();
    expect(ctl.listenerCount()).toBe(0);
  });

  describe('SSR-safe default', () => {
    beforeEach(() => {
      vi.stubGlobal('matchMedia', undefined);
    });
    it('defaults to false when matchMedia is unavailable', () => {
      const { result } = renderHook(() => usePrefersReducedMotion());
      expect(result.current).toBe(false);
    });
  });
});
