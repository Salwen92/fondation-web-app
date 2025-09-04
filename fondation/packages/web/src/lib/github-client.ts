/**
 * GitHub API Client with Rate Limiting
 *
 * Provides a rate-limited GitHub API client that respects GitHub's rate limits
 * and implements exponential backoff for resilient API usage.
 *
 * @module github-client
 */

import { maskSensitiveData } from './encryption';

export interface GitHubRateLimit {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  used: number;
}

export interface GitHubApiOptions {
  token: string;
  baseUrl?: string;
  userAgent?: string;
  maxRetries?: number;
  retryDelay?: number;
}

export interface GitHubApiResponse<T = any> {
  data?: T;
  error?: string;
  rateLimit?: GitHubRateLimit;
  status?: number;
}

/**
 * GitHub API client with built-in rate limiting and retry logic
 */
export class GitHubClient {
  private token: string;
  private baseUrl: string;
  private userAgent: string;
  private maxRetries: number;
  private retryDelay: number;

  // Rate limit tracking
  private rateLimitRemaining = 5000;
  private rateLimitReset = 0;
  private rateLimitLimit = 5000;

  // Request queue for rate limiting
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;

  constructor(options: GitHubApiOptions) {
    this.token = options.token;
    this.baseUrl = options.baseUrl || 'https://api.github.com';
    this.userAgent = options.userAgent || 'Fondation-App/1.0';
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
  }

  /**
   * Make a rate-limited request to GitHub API
   */
  async request<T = any>(path: string, options: RequestInit = {}): Promise<GitHubApiResponse<T>> {
    // Check rate limits before making request
    await this.checkRateLimit();

    const url = `${this.baseUrl}${path}`;
    const headers = {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': this.userAgent,
      ...options.headers,
    };

    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers,
        });

        // Update rate limit information
        this.updateRateLimit(response.headers);

        // Handle rate limit exceeded
        if (response.status === 429) {
          const resetTime = this.rateLimitReset * 1000;
          const waitTime = Math.max(resetTime - Date.now(), 1000);

          console.warn(`Rate limit exceeded. Waiting ${waitTime}ms until reset.`);
          await this.sleep(waitTime);
          continue; // Retry the request
        }

        // Handle other error status codes
        if (!response.ok) {
          const errorBody = await response.text();

          // Retry on server errors
          if (response.status >= 500 && attempt < this.maxRetries - 1) {
            await this.sleep(this.retryDelay * 2 ** attempt); // Exponential backoff
            continue;
          }

          return {
            error: `GitHub API error ${response.status}: ${maskSensitiveData(errorBody)}`,
            status: response.status,
            rateLimit: this.getCurrentRateLimit(),
          };
        }

        // Success
        const data = (await response.json()) as T;

        return {
          data,
          status: response.status,
          rateLimit: this.getCurrentRateLimit(),
        };
      } catch (error) {
        lastError = error as Error;

        // Retry on network errors
        if (attempt < this.maxRetries - 1) {
          await this.sleep(this.retryDelay * 2 ** attempt);
        }
      }
    }

    // All retries exhausted
    return {
      error: `Request failed after ${this.maxRetries} attempts: ${maskSensitiveData(lastError?.message || 'Unknown error')}`,
      rateLimit: this.getCurrentRateLimit(),
    };
  }

  /**
   * Update rate limit information from response headers
   */
  private updateRateLimit(headers: Headers): void {
    const limit = headers.get('X-RateLimit-Limit');
    const remaining = headers.get('X-RateLimit-Remaining');
    const reset = headers.get('X-RateLimit-Reset');

    if (limit) this.rateLimitLimit = Number.parseInt(limit, 10);
    if (remaining) this.rateLimitRemaining = Number.parseInt(remaining, 10);
    if (reset) this.rateLimitReset = Number.parseInt(reset, 10);
  }

  /**
   * Check rate limits and wait if necessary
   */
  private async checkRateLimit(): Promise<void> {
    // If we're running low on requests, start being more careful
    if (this.rateLimitRemaining < 100) {
      const now = Date.now() / 1000;
      const timeUntilReset = this.rateLimitReset - now;

      if (timeUntilReset > 0 && this.rateLimitRemaining < 10) {
        // Very low on requests, wait until reset
        const waitTime = timeUntilReset * 1000;
        console.warn(
          `Low on API requests (${this.rateLimitRemaining} remaining). Waiting ${waitTime}ms for reset.`,
        );
        await this.sleep(waitTime);
      } else if (this.rateLimitRemaining < 50) {
        // Moderate throttling
        await this.sleep(1000);
      }
    }
  }

  /**
   * Get current rate limit status
   */
  getCurrentRateLimit(): GitHubRateLimit {
    return {
      limit: this.rateLimitLimit,
      remaining: this.rateLimitRemaining,
      reset: this.rateLimitReset,
      used: this.rateLimitLimit - this.rateLimitRemaining,
    };
  }

  /**
   * Check rate limit status without making a request
   */
  async checkRateLimitStatus(): Promise<GitHubRateLimit> {
    const response = await this.request('/rate_limit');

    if (response.data) {
      const core = response.data.resources?.core;
      if (core) {
        this.rateLimitLimit = core.limit;
        this.rateLimitRemaining = core.remaining;
        this.rateLimitReset = core.reset;
      }
    }

    return this.getCurrentRateLimit();
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Convenient API methods

  /**
   * Get repository information
   */
  async getRepository(owner: string, repo: string): Promise<GitHubApiResponse> {
    return this.request(`/repos/${owner}/${repo}`);
  }

  /**
   * Get repository languages
   */
  async getRepositoryLanguages(owner: string, repo: string): Promise<GitHubApiResponse> {
    return this.request(`/repos/${owner}/${repo}/languages`);
  }

  /**
   * List user repositories
   */
  async listUserRepositories(options?: {
    type?: 'all' | 'owner' | 'public' | 'private' | 'member';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    per_page?: number;
    page?: number;
  }): Promise<GitHubApiResponse> {
    const params = new URLSearchParams();

    if (options?.type) params.append('type', options.type);
    if (options?.sort) params.append('sort', options.sort);
    if (options?.per_page) params.append('per_page', String(options.per_page));
    if (options?.page) params.append('page', String(options.page));

    const query = params.toString();
    return this.request(`/user/repos${query ? `?${query}` : ''}`);
  }

  /**
   * Get authenticated user information
   */
  async getCurrentUser(): Promise<GitHubApiResponse> {
    return this.request('/user');
  }

  /**
   * Validate token and get scopes
   */
  async validateToken(): Promise<{
    valid: boolean;
    scopes: string[];
    rateLimit: GitHubRateLimit;
  }> {
    const response = await this.request('/user');

    if (response.error) {
      return {
        valid: false,
        scopes: [],
        rateLimit: this.getCurrentRateLimit(),
      };
    }

    // Parse scopes from the last request
    // Note: This would need to be extracted from response headers
    return {
      valid: true,
      scopes: [], // Would be populated from X-OAuth-Scopes header
      rateLimit: this.getCurrentRateLimit(),
    };
  }
}

/**
 * Create a GitHub client with rate limiting
 */
export function createGitHubClient(token: string): GitHubClient {
  return new GitHubClient({ token });
}

/**
 * Check if we're approaching rate limits
 */
export function isApproachingRateLimit(rateLimit: GitHubRateLimit): boolean {
  const percentageUsed = (rateLimit.used / rateLimit.limit) * 100;
  return percentageUsed > 80 || rateLimit.remaining < 100;
}

/**
 * Calculate wait time until rate limit reset
 */
export function calculateWaitTime(rateLimit: GitHubRateLimit): number {
  const now = Date.now() / 1000;
  const timeUntilReset = rateLimit.reset - now;
  return Math.max(0, Math.ceil(timeUntilReset * 1000));
}
