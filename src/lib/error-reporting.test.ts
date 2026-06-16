import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reportError, installGlobalErrorReporting } from '@/lib/error-reporting';
import { CONSENT_STORAGE_KEY } from '@/lib/consent';

type ClarityWin = Window & { clarity?: (...args: unknown[]) => void };

describe('error-reporting', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.clear();
    delete (window as ClarityWin).clarity;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    delete (window as ClarityWin).clarity;
  });

  it('always logs to the console regardless of consent', () => {
    reportError(new Error('boom'), { source: 'react' });
    expect(console.error).toHaveBeenCalled();
  });

  it('does not forward to Clarity without analytics consent', () => {
    const clarity = vi.fn();
    (window as ClarityWin).clarity = clarity;
    // No consent stored.
    reportError(new Error('boom'), { source: 'window' });
    expect(clarity).not.toHaveBeenCalled();
  });

  it('forwards a custom event + tags to Clarity once consented', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, 'accepted');
    const clarity = vi.fn();
    (window as ClarityWin).clarity = clarity;

    reportError(new TypeError('bad thing happened'), { source: 'react' });

    expect(clarity).toHaveBeenCalledWith('set', 'lastErrorSource', 'react');
    expect(clarity).toHaveBeenCalledWith('set', 'lastError', 'TypeError: bad thing happened');
    expect(clarity).toHaveBeenCalledWith('event', 'app-error');
  });

  it('truncates very long error messages', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, 'accepted');
    const clarity = vi.fn();
    (window as ClarityWin).clarity = clarity;

    reportError(new Error('x'.repeat(500)), { source: 'window' });

    const tagCall = clarity.mock.calls.find((c) => c[0] === 'set' && c[1] === 'lastError');
    expect(tagCall).toBeDefined();
    expect((tagCall![2] as string).length).toBeLessThanOrEqual(250);
  });

  it('never throws even if Clarity throws', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, 'accepted');
    (window as ClarityWin).clarity = () => {
      throw new Error('clarity exploded');
    };
    expect(() => reportError(new Error('boom'), { source: 'react' })).not.toThrow();
  });

  it('installs global listeners once and disposes them', () => {
    const handlers: Record<string, Array<(e: unknown) => void>> = {};
    const target = {
      addEventListener: vi.fn((type: string, cb: (e: unknown) => void) => {
        (handlers[type] ||= []).push(cb);
      }),
      removeEventListener: vi.fn((type: string, cb: (e: unknown) => void) => {
        handlers[type] = (handlers[type] || []).filter((f) => f !== cb);
      }),
    } as unknown as Window;

    const dispose = installGlobalErrorReporting(target);
    // Second install is a no-op while the first is active.
    const noop = installGlobalErrorReporting(target);

    expect(target.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
    expect(target.addEventListener).toHaveBeenCalledWith(
      'unhandledrejection',
      expect.any(Function),
    );
    expect(handlers['error']).toHaveLength(1);

    // Firing the captured handler routes into reportError (which logs).
    localStorage.setItem(CONSENT_STORAGE_KEY, 'accepted');
    const clarity = vi.fn();
    (window as ClarityWin).clarity = clarity;
    handlers['error'][0]({ error: new Error('global boom') });
    expect(clarity).toHaveBeenCalledWith('event', 'app-error');

    noop();
    dispose();
    expect(target.removeEventListener).toHaveBeenCalledWith('error', expect.any(Function));
  });
});
