export interface RetryOptions {
  maxRetries: number;
  /** Base delay in ms; actual delay grows exponentially with full jitter. */
  baseDelayMs?: number;
  /** Decides whether a given error is worth retrying. */
  isRetryable: (err: unknown) => boolean;
  onRetry?: (attempt: number, delayMs: number, err: unknown) => void;
}

/**
 * Runs `fn`, retrying on retryable errors with exponential backoff + full
 * jitter. Throws the last error once retries are exhausted.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions,
): Promise<T> {
  const base = opts.baseDelayMs ?? 500;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === opts.maxRetries || !opts.isRetryable(err)) {
        throw err;
      }
      const expDelay = base * 2 ** attempt;
      const delay = Math.round(Math.random() * expDelay); // full jitter
      opts.onRetry?.(attempt + 1, delay, err);
      await sleep(delay);
    }
  }

  // Unreachable, but satisfies the type checker.
  throw lastErr;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
