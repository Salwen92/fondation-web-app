/**
 * Retry mechanism utilities for handling transient failures
 * Provides exponential backoff and circuit breaker patterns
 */

import { logger } from "./logger";
import { categorizeError, ErrorCategory } from "./error-messages";

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  shouldRetry: (error) => {
    const category = categorizeError(error);
    // Retry network and system errors, but not auth or validation errors
    return category === ErrorCategory.NETWORK || category === ErrorCategory.SYSTEM;
  },
  onRetry: (error, attempt) => {
    logger.info(`Retry attempt ${attempt}`, { error: String(error) });
  },
};

/**
 * Execute a function with automatic retry on failure
 * Uses exponential backoff between retries
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      if (attempt === opts.maxAttempts || !opts.shouldRetry(error, attempt)) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelay
      );
      
      // Notify about retry
      opts.onRetry(error, attempt);
      
      // Wait before retrying
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Circuit breaker pattern implementation
 * Prevents repeated calls to a failing service
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "closed" | "open" | "half-open" = "closed";
  
  constructor(
    private readonly threshold = 5,
    private readonly timeout = 60000, // 1 minute
    private readonly resetTimeout = 30000 // 30 seconds
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should be reset
    if (this.state === "open") {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure > this.timeout) {
        this.state = "half-open";
        logger.info("Circuit breaker entering half-open state");
      } else {
        throw new Error("Circuit breaker is open - service unavailable");
      }
    }
    
    try {
      const result = await fn();
      
      // Success - reset failures if in half-open state
      if (this.state === "half-open") {
        this.state = "closed";
        this.failures = 0;
        logger.info("Circuit breaker closed - service recovered");
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
  
  private recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = "open";
      logger.warn(`Circuit breaker opened after ${this.failures} failures`);
      
      // Schedule automatic reset
      setTimeout(() => {
        if (this.state === "open") {
          this.state = "half-open";
          logger.info("Circuit breaker auto-reset to half-open");
        }
      }, this.resetTimeout);
    }
  }
  
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
  
  reset() {
    this.state = "closed";
    this.failures = 0;
    this.lastFailureTime = 0;
    logger.info("Circuit breaker manually reset");
  }
}

/**
 * Retry with circuit breaker pattern
 * Combines retry logic with circuit breaker to prevent cascading failures
 */
export async function withCircuitBreaker<T>(
  fn: () => Promise<T>,
  circuitBreaker: CircuitBreaker,
  retryOptions: RetryOptions = {}
): Promise<T> {
  return circuitBreaker.execute(() => withRetry(fn, retryOptions));
}

/**
 * Helper function for async sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a retryable fetch function
 * Automatically retries failed fetch requests
 */
export function createRetryableFetch(options: RetryOptions = {}) {
  return async (url: string, init?: RequestInit): Promise<Response> => {
    return withRetry(
      async () => {
        const response = await fetch(url, init);
        
        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Retry on server errors (5xx)
        if (response.status >= 500) {
          const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
          if (options.shouldRetry?.(error, 1) ?? true) {
            throw error;
          }
        }
        
        return response;
      },
      {
        ...options,
        shouldRetry: (error, attempt) => {
          // Custom retry logic for fetch
          if (error instanceof Error) {
            const message = error.message.toLowerCase();
            // Don't retry client errors
            if (message.includes("http 4")) return false;
            // Retry network and server errors
            if (message.includes("fetch") || message.includes("network") || 
                message.includes("http 5")) {
              return true;
            }
          }
          return options.shouldRetry?.(error, attempt) ?? false;
        },
      }
    );
  };
}

/**
 * Hook for using retry logic in React components
 */
export function useRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
) {
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);
  const [error, setError] = React.useState<unknown>(null);
  
  const execute = React.useCallback(async () => {
    setIsRetrying(true);
    setError(null);
    
    try {
      const result = await withRetry(fn, {
        ...options,
        onRetry: (err, attempt) => {
          setRetryCount(attempt);
          options.onRetry?.(err, attempt);
        },
      });
      
      setRetryCount(0);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsRetrying(false);
    }
  }, [fn, options]);
  
  const reset = React.useCallback(() => {
    setIsRetrying(false);
    setRetryCount(0);
    setError(null);
  }, []);
  
  return {
    execute,
    reset,
    isRetrying,
    retryCount,
    error,
  };
}

// Import React for the hook
import * as React from "react";