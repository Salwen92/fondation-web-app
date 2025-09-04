/**
 * Simple in-memory cache with TTL and deduplication
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private pending = new Map<string, Promise<unknown>>();

  /**
   * Get cached value if valid
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cache value with TTL
   */
  set<T>(key: string, data: T, ttlMs = 60000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  /**
   * Clear specific key or entire cache
   */
  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
      this.pending.delete(key);
    } else {
      this.cache.clear();
      this.pending.clear();
    }
  }

  /**
   * Get or fetch with deduplication
   */
  async getOrFetch<T>(key: string, fetcher: () => Promise<T>, ttlMs = 60000): Promise<T> {
    // Check cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Check if already fetching (deduplication)
    const pending = this.pending.get(key) as Promise<T> | undefined;
    if (pending) {
      return pending;
    }

    // Start new fetch
    const promise = fetcher()
      .then((data) => {
        this.set(key, data, ttlMs);
        this.pending.delete(key);
        return data;
      })
      .catch((error) => {
        this.pending.delete(key);
        throw error;
      });

    this.pending.set(key, promise);
    return promise;
  }

  /**
   * Invalidate cache entries matching pattern
   */
  invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton instance
export const cache = new MemoryCache();

/**
 * Create a cached version of an async function
 */
export function memoize<T extends (...args: never[]) => Promise<unknown>>(
  fn: T,
  options?: {
    keyGenerator?: (...args: Parameters<T>) => string;
    ttlMs?: number;
  },
): T {
  const keyGen = options?.keyGenerator ?? ((...args) => JSON.stringify(args));
  const ttl = options?.ttlMs ?? 60000;

  return (async (...args: Parameters<T>) => {
    const key = `memoized:${fn.name}:${keyGen(...args)}`;
    return cache.getOrFetch(key, () => fn(...args), ttl);
  }) as T;
}

/**
 * React hook for cached data fetching
 */
export function useCachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    ttlMs?: number;
    enabled?: boolean;
    onError?: (error: Error) => void;
  },
): {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [state, setState] = React.useState<{
    data: T | null;
    isLoading: boolean;
    error: Error | null;
  }>({
    data: cache.get<T>(key),
    isLoading: false,
    error: null,
  });

  const refetch = React.useCallback(async () => {
    if (options?.enabled === false) {
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const data = await cache.getOrFetch(key, fetcher, options?.ttlMs);
      setState({ data, isLoading: false, error: null });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      setState((prev) => ({ ...prev, isLoading: false, error: err }));
      options?.onError?.(err);
    }
  }, [key, fetcher, options]);

  React.useEffect(() => {
    if (options?.enabled !== false && state.data === null) {
      refetch().catch(() => {
        // Error handling would be implemented here
      });
    }
  }, [options?.enabled, state.data, refetch]);

  return { ...state, refetch };
}

// Helper for React import
import React from 'react';
