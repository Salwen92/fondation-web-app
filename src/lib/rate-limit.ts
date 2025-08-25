/**
 * Rate limiting utilities for API protection
 */

interface RateLimitStore {
  attempts: number;
  resetTime: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitStore>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up expired entries every minute
    if (typeof setInterval !== "undefined") {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    }
  }

  /**
   * Check if request should be allowed
   */
  check(
    key: string,
    options: {
      windowMs?: number;
      maxRequests?: number;
    } = {}
  ): { allowed: boolean; retryAfter?: number } {
    const windowMs = options.windowMs ?? 60000; // 1 minute default
    const maxRequests = options.maxRequests ?? 10; // 10 requests default
    const now = Date.now();

    const record = this.store.get(key);

    // No record or expired window
    if (!record || now > record.resetTime) {
      this.store.set(key, {
        attempts: 1,
        resetTime: now + windowMs,
      });
      return { allowed: true };
    }

    // Within window
    if (record.attempts < maxRequests) {
      record.attempts++;
      return { allowed: true };
    }

    // Rate limited
    return {
      allowed: false,
      retryAfter: Math.ceil((record.resetTime - now) / 1000),
    };
  }

  /**
   * Reset limit for a key
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Destroy the rate limiter
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

// Singleton instances for different purposes
export const apiLimiter = new RateLimiter();
export const authLimiter = new RateLimiter();

/**
 * Express/Next.js middleware for rate limiting
 */
export function rateLimitMiddleware(options?: {
  keyGenerator?: (req: Request) => string;
  windowMs?: number;
  maxRequests?: number;
  message?: string;
}) {
  return async (req: Request): Promise<Response | null> => {
    // Generate key from IP or custom generator
    const key = options?.keyGenerator
      ? options.keyGenerator(req)
      : getClientIp(req);

    const result = apiLimiter.check(key, {
      windowMs: options?.windowMs,
      maxRequests: options?.maxRequests,
    });

    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: options?.message ?? "Trop de requêtes. Veuillez réessayer plus tard.",
          retryAfter: result.retryAfter,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(result.retryAfter ?? 60),
            "X-RateLimit-Limit": String(options?.maxRequests ?? 10),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(Date.now() + (result.retryAfter ?? 60) * 1000).toISOString(),
          },
        }
      );
    }

    return null; // Continue processing
  };
}

/**
 * Get client IP from request
 */
function getClientIp(req: Request): string {
  const url = new URL(req.url);
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  
  if (forwarded) {
    const firstIp = forwarded.split(",")[0];
    return firstIp ? firstIp.trim() : "unknown";
  }
  
  if (realIp) {
    return realIp;
  }
  
  // Fallback to a hash of headers for identification
  const identifier = [
    req.headers.get("user-agent"),
    req.headers.get("accept-language"),
    url.hostname,
  ].join("-");
  
  return Buffer.from(identifier).toString("base64").substring(0, 16);
}

/**
 * React hook for client-side rate limiting
 */
export function useRateLimit(
  key: string,
  options?: {
    windowMs?: number;
    maxRequests?: number;
  }
): {
  canProceed: () => boolean;
  getRemainingTime: () => number;
  reset: () => void;
} {
  const limiter = React.useMemo(() => new RateLimiter(), []);

  React.useEffect(() => {
    return () => {
      if (limiter) {
        limiter.destroy();
      }
    };
  }, [limiter]);

  return React.useMemo(
    () => ({
      canProceed: () => limiter.check(key, options).allowed,
      getRemainingTime: () => {
        const result = limiter.check(key, options);
        return result.retryAfter ?? 0;
      },
      reset: () => limiter.reset(key),
    }),
    [limiter, key, options]
  );
}

// Helper for React import
import React from "react";