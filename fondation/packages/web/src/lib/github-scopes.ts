/**
 * GitHub OAuth Scope Management
 *
 * Manages GitHub OAuth scopes based on application needs.
 * Follows principle of least privilege - request only necessary permissions.
 *
 * @see https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps
 */

export interface GitHubScope {
  name: string;
  description: string;
  permissions: string[];
  required: boolean;
}

/**
 * Available GitHub OAuth scopes
 */
export const GITHUB_SCOPES = {
  // User scopes
  READ_USER: {
    name: 'read:user',
    description: 'Read user profile data',
    permissions: ['View user profile', 'Access username and avatar'],
    required: true,
  },
  USER_EMAIL: {
    name: 'user:email',
    description: 'Access user email addresses',
    permissions: ['View email addresses', 'View primary email'],
    required: true,
  },

  // Repository scopes
  PUBLIC_REPO: {
    name: 'public_repo',
    description: 'Access public repositories',
    permissions: [
      'Read public repositories',
      'Clone public repositories',
      'Access public repository metadata',
    ],
    required: false,
  },
  REPO: {
    name: 'repo',
    description: 'Full control of private repositories',
    permissions: [
      'Read private repositories',
      'Write to repositories',
      'Access repository webhooks',
      'Manage deploy keys',
      'Everything from public_repo',
    ],
    required: false,
  },

  // Additional scopes (not currently used)
  REPO_STATUS: {
    name: 'repo:status',
    description: 'Access commit status',
    permissions: ['Read commit status', 'Create commit status'],
    required: false,
  },
  READ_ORG: {
    name: 'read:org',
    description: 'Read organization membership',
    permissions: ['View organization membership', 'View organization teams'],
    required: false,
  },
} as const;

/**
 * Scope configurations for different use cases
 */
export const SCOPE_CONFIGS = {
  // Minimal - only public repository access
  MINIMAL: {
    name: 'Minimal Access',
    description: 'Access to public repositories only',
    scopes: ['read:user', 'user:email', 'public_repo'],
  },

  // Standard - includes private repository access
  STANDARD: {
    name: 'Standard Access',
    description: 'Access to all repositories including private',
    scopes: ['read:user', 'user:email', 'repo'],
  },

  // Extended - includes additional metadata
  EXTENDED: {
    name: 'Extended Access',
    description: 'Full repository access with status and org data',
    scopes: ['read:user', 'user:email', 'repo', 'repo:status', 'read:org'],
  },
} as const;

/**
 * Get the appropriate scope configuration based on environment
 */
export function getScopeConfiguration(): string {
  // Check environment variable
  const privateRepoAccess = process.env.GITHUB_PRIVATE_REPO_ACCESS === 'true';
  const extendedAccess = process.env.GITHUB_EXTENDED_ACCESS === 'true';

  if (extendedAccess) {
    return SCOPE_CONFIGS.EXTENDED.scopes.join(' ');
  }

  if (privateRepoAccess) {
    return SCOPE_CONFIGS.STANDARD.scopes.join(' ');
  }

  return SCOPE_CONFIGS.MINIMAL.scopes.join(' ');
}

/**
 * Check if a token has specific scopes
 * This would be called after receiving the token from GitHub
 */
export async function validateTokenScopes(token: string): Promise<{
  valid: boolean;
  scopes: string[];
  missing: string[];
}> {
  try {
    // Make a request to GitHub API to check token scopes
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      return {
        valid: false,
        scopes: [],
        missing: ['Token validation failed'],
      };
    }

    // GitHub returns scopes in the X-OAuth-Scopes header
    const scopeHeader = response.headers.get('X-OAuth-Scopes') || '';
    const tokenScopes = scopeHeader
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    // Check for required scopes
    const requiredScopes = ['read:user', 'user:email'];
    const missing = requiredScopes.filter((scope) => !tokenScopes.includes(scope));

    return {
      valid: missing.length === 0,
      scopes: tokenScopes,
      missing,
    };
  } catch (_error) {
    return {
      valid: false,
      scopes: [],
      missing: ['Failed to validate token'],
    };
  }
}

/**
 * Check if a token can access private repositories
 */
export function hasPrivateRepoAccess(scopes: string[]): boolean {
  return scopes.includes('repo');
}

/**
 * Check if a token can access public repositories
 */
export function hasPublicRepoAccess(scopes: string[]): boolean {
  return scopes.includes('public_repo') || scopes.includes('repo');
}

/**
 * Get a human-readable description of granted permissions
 */
export function describeScopes(scopes: string[]): string[] {
  const descriptions: string[] = [];

  if (scopes.includes('read:user')) {
    descriptions.push('✓ Read your profile information');
  }

  if (scopes.includes('user:email')) {
    descriptions.push('✓ Access your email addresses');
  }

  if (scopes.includes('repo')) {
    descriptions.push('✓ Full access to all your repositories (public and private)');
  } else if (scopes.includes('public_repo')) {
    descriptions.push('✓ Access your public repositories only');
  }

  if (scopes.includes('repo:status')) {
    descriptions.push('✓ Read and write commit statuses');
  }

  if (scopes.includes('read:org')) {
    descriptions.push('✓ Read your organization membership');
  }

  return descriptions;
}

/**
 * Log scope usage for security auditing
 */
export function logScopeUsage(userId: string, scopes: string[], action: string): void {
  const _scopeInfo = {
    timestamp: new Date().toISOString(),
    userId,
    scopes,
    action,
    hasPrivateAccess: hasPrivateRepoAccess(scopes),
    type: 'GITHUB_SCOPE_USAGE',
  };

  // In production, this would go to a security log
  if (process.env.NODE_ENV === 'production') {
    // Security event would be logged to monitoring system
  }
}
