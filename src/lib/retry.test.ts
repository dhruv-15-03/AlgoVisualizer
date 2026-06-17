import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '@/lib/retry';

const noSleep = () => Promise.resolve();

describe('withRetry', () => {
  it('returns immediately on first success without retrying', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const onRetry = vi.fn();
    await expect(withRetry(fn, { sleep: noSleep, onRetry })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('retries then succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('net 1'))
      .mockRejectedValueOnce(new Error('net 2'))
      .mockResolvedValue('recovered');
    const onRetry = vi.fn();
    await expect(withRetry(fn, { retries: 3, sleep: noSleep, onRetry })).resolves.toBe(
      'recovered',
    );
    expect(fn).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenLastCalledWith(2, expect.any(Error));
  });

  it('throws the last error after exhausting retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always down'));
    await expect(withRetry(fn, { retries: 2, sleep: noSleep })).rejects.toThrow('always down');
    expect(fn).toHaveBeenCalledTimes(3); // 1 + 2 retries
  });

  it('does not retry when retries is 0', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('one shot'));
    await expect(withRetry(fn, { retries: 0, sleep: noSleep })).rejects.toThrow('one shot');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('passes the attempt index to fn and applies capped exponential backoff', async () => {
    const delays: number[] = [];
    const sleep = (ms: number) => {
      delays.push(ms);
      return Promise.resolve();
    };
    const attempts: number[] = [];
    const fn = vi.fn((attempt: number) => {
      attempts.push(attempt);
      return Promise.reject(new Error('fail'));
    });
    await expect(
      withRetry(fn, { retries: 4, baseDelayMs: 100, factor: 2, maxDelayMs: 350, sleep }),
    ).rejects.toThrow('fail');
    expect(attempts).toEqual([0, 1, 2, 3, 4]);
    // 100, 200, 350(capped from 400), 350(capped from 800)
    expect(delays).toEqual([100, 200, 350, 350]);
  });
});
