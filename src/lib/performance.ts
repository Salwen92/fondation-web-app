/**
 * Performance monitoring and optimization utilities
 */

import { logger, logPerformance } from "./logger";

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric>();
  private observers: PerformanceObserver[] = [];

  constructor() {
    if (typeof window !== "undefined" && "PerformanceObserver" in window) {
      this.initializeObservers();
    }
  }

  /**
   * Start timing an operation
   */
  start(name: string, metadata?: Record<string, unknown>): void {
    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata,
    });
  }

  /**
   * End timing and log the result
   */
  end(name: string): number | null {
    const metric = this.metrics.get(name);
    if (!metric) {
      logger.warn(`Performance metric '${name}' was not started`);
      return null;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    
    logPerformance(name, metric.duration, {
      extra: metric.metadata,
    });

    this.metrics.delete(name);
    return metric.duration;
  }

  /**
   * Measure async function performance
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    this.start(name, metadata);
    try {
      const result = await fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  /**
   * Measure sync function performance
   */
  measureSync<T>(
    name: string,
    fn: () => T,
    metadata?: Record<string, unknown>
  ): T {
    this.start(name, metadata);
    try {
      const result = fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  /**
   * Initialize performance observers
   */
  private initializeObservers(): void {
    // Monitor long tasks
    if ("PerformanceObserver" in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              logger.warn(`Long task detected: ${entry.duration}ms`, {
                extra: {
                  duration: entry.duration,
                  startTime: entry.startTime,
                  name: entry.name,
                },
              });
            }
          }
        });
        
        longTaskObserver.observe({ entryTypes: ["longtask"] });
        this.observers.push(longTaskObserver);
      } catch {
        // Long task observer not supported
      }

      // Monitor resource loading
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const resourceEntry = entry as PerformanceResourceTiming;
            if (resourceEntry.duration > 1000) {
              logger.warn(`Slow resource: ${resourceEntry.name}`, {
                extra: {
                  duration: resourceEntry.duration,
                  transferSize: resourceEntry.transferSize,
                  type: resourceEntry.initiatorType,
                },
              });
            }
          }
        });
        
        resourceObserver.observe({ entryTypes: ["resource"] });
        this.observers.push(resourceObserver);
      } catch {
        // Resource observer not supported
      }
    }
  }

  /**
   * Get Core Web Vitals
   */
  getCoreWebVitals(): {
    lcp?: number;
    fid?: number;
    cls?: number;
    fcp?: number;
    ttfb?: number;
  } {
    if (typeof window === "undefined" || !("performance" in window)) {
      return {};
    }

    const metrics: ReturnType<typeof this.getCoreWebVitals> = {};
    
    // Get paint timings
    const paintEntries = performance.getEntriesByType("paint");
    for (const entry of paintEntries) {
      if (entry.name === "first-contentful-paint") {
        metrics.fcp = entry.startTime;
      }
    }

    // Get navigation timing
    const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    if (navEntries.length > 0) {
      const nav = navEntries[0];
      if (nav) {
        metrics.ttfb = nav.responseStart - nav.requestStart;
      }
    }

    return metrics;
  }

  /**
   * Report metrics to analytics
   */
  report(): void {
    const vitals = this.getCoreWebVitals();
    
    if (Object.keys(vitals).length > 0) {
      logger.info("Core Web Vitals", {
        extra: vitals,
      });
    }

    // Report memory usage if available
    if ("memory" in performance) {
      const memoryInfo = (performance as unknown as { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      logger.info("Memory usage", {
        extra: {
          usedJSHeapSize: memoryInfo.usedJSHeapSize,
          totalJSHeapSize: memoryInfo.totalJSHeapSize,
          jsHeapSizeLimit: memoryInfo.jsHeapSizeLimit,
        },
      });
    }
  }

  /**
   * Clean up observers
   */
  destroy(): void {
    for (const observer of this.observers) {
      observer.disconnect();
    }
    this.observers = [];
    this.metrics.clear();
  }
}

// Singleton instance
export const perfMonitor = new PerformanceMonitor();

/**
 * React hook for component render performance
 */
export function useRenderMetrics(componentName: string) {
  React.useEffect(() => {
    perfMonitor.start(`${componentName}:mount`);
    return () => {
      perfMonitor.end(`${componentName}:mount`);
    };
  }, [componentName]);

  React.useEffect(() => {
    perfMonitor.start(`${componentName}:render`);
    perfMonitor.end(`${componentName}:render`);
  });
}

/**
 * Debounce function with performance tracking
 */
export function debounceWithMetrics<T extends (...args: never[]) => unknown>(
  fn: T,
  delay: number,
  name?: string
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  let callCount = 0;

  return (...args: Parameters<T>) => {
    callCount++;
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      if (name) {
        perfMonitor.measureSync(
          `${name}:debounced`,
          () => fn(...args),
          { callCount }
        );
      } else {
        fn(...args);
      }
      callCount = 0;
    }, delay);
  };
}

/**
 * Throttle function with performance tracking
 */
export function throttleWithMetrics<T extends (...args: never[]) => unknown>(
  fn: T,
  limit: number,
  name?: string
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      if (name) {
        perfMonitor.measureSync(
          `${name}:throttled`,
          () => fn(...args)
        );
      } else {
        fn(...args);
      }
      
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          fn(...lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args;
    }
  };
}

// Helper for React import
import React from "react";