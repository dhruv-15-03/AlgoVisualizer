/**
 * Small async retry helper with exponential backoff.
 *
 * Used to make the Pyodide CDN cold-load resilient to transient network blips
 * (jsDelivr hiccup, flaky connection) instead of failing permanently on the
 * first error. Kept dependency-free and pure (the clock is injectable) so it's
 * trivially unit-testable.
 */

export interface RetryOptions {
  /** Number of retries *after* the first attempt. Default 2 (3 attempts). */
  retries?: number;
  /** Base backoff delay in ms (grows by `factor` each retry). Default 500. */
  baseDelayMs?: number;
  /** Backoff multiplier. Default 2. */
  factor?: number;
  /** Upper bound on a single backoff delay. Default 8000. */
  maxDelayMs?: number;
  /** Called before each retry with the upcoming attempt number + the error. */
  onRetry?: (attempt: number, error: unknown) => void;
  /** Injectable sleep (tests pass a no-op). Default real timer. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run `fn`, retrying on rejection up to `retries` times with exponential
 * backoff. Resolves with the first success; rejects with the last error once
 * attempts are exhausted.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const {
    retries = 2,
    baseDelayMs = 500,
    factor = 2,
    maxDelayMs = 8000,
    onRetry,
    sleep = defaultSleep,
  } = opts;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      if (attempt === retries) break;
      onRetry?.(attempt + 1, err);
      const delay = Math.min(maxDelayMs, baseDelayMs * factor ** attempt);
      await sleep(delay);
    }
  }
  throw lastError;
}
