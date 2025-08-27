/**
 * Environment-aware configuration utilities
 * Provides dynamic URL generation for different deployment environments
 */

/**
 * Get the application's base URL based on the current environment
 */
export function getAppBaseUrl(): string {
  // In browser environment, use window.location.origin
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  // Server-side fallback based on environment
  if (process.env.NODE_ENV === "production") {
    return process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://fondation.ai"; // Fallback production URL
  }

  // Development environment
  return "http://localhost:3000";
}

/**
 * Get the webhook callback URL for job status updates
 */
export function getJobCallbackUrl(): string {
  return `${getAppBaseUrl()}/api/webhook/job-callback`;
}

/**
 * Get the gateway URL for job processing
 */
export function getGatewayUrl(): string {
  if (process.env.NODE_ENV === "production") {
    return process.env.WORKER_GATEWAY_URL ?? "https://gateway.fondation.ai";
  }
  
  return "http://localhost:8081";
}

/**
 * Configuration object for the application
 */
export const appConfig = {
  baseUrl: getAppBaseUrl(),
  api: {
    jobCallback: getJobCallbackUrl(),
    gateway: getGatewayUrl(),
  },
  isProduction: process.env.NODE_ENV === "production",
  isDevelopment: process.env.NODE_ENV === "development",
} as const;