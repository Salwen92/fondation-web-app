/**
 * Retry utility for resilient API calls
 */

interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 10000,
  shouldRetry: (error) => {
    // Retry on network errors and 5xx status codes
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes("network") ||
        message.includes("fetch") ||
        message.includes("timeout")
      );
    }
    return false;
  },
  onRetry: (attempt, error) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`Retry attempt ${attempt}:`, error);
    }
  },
};

/**
 * Execute a function with automatic retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;
  let delay = opts.delayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt === opts.maxAttempts || !opts.shouldRetry(error)) {
        throw error;
      }

      // Call retry callback
      opts.onRetry(attempt, error);

      // Wait before retrying with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay));
      
      // Increase delay for next attempt
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
    }
  }

  throw lastError;
}

/**
 * Fetch with automatic retry
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  return withRetry(
    async () => {
      const response = await fetch(url, init);
      
      // Throw on 5xx errors to trigger retry
      if (response.status >= 500) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      return response;
    },
    {
      ...options,
      shouldRetry: (error) => {
        // Default retry logic plus 5xx errors
        if (DEFAULT_OPTIONS.shouldRetry(error)) {
          return true;
        }
        
        if (error instanceof Error) {
          return error.message.includes("Server error");
        }
        
        return false;
      },
    }
  );
}

/**
 * Create a retry wrapper for Convex mutations
 */
export function createRetryMutation<T extends (...args: never[]) => Promise<unknown>>(
  mutation: T,
  options?: RetryOptions
): T {
  return (async (...args: Parameters<T>) => {
    return withRetry(
      () => mutation(...args),
      {
        ...options,
        shouldRetry: (error) => {
          // Retry on Convex-specific errors
          if (error instanceof Error) {
            const message = error.message.toLowerCase();
            return (
              message.includes("network") ||
              message.includes("timeout") ||
              message.includes("rate limit") ||
              message.includes("temporarily unavailable")
            );
          }
          return false;
        },
      }
    );
  }) as T;
}