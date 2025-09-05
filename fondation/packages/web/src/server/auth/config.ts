import type { NextAuthConfig, Account, Profile } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';
import { env } from '@/env';
import { getScopeConfiguration, logScopeUsage, validateTokenScopes } from '@/lib/github-scopes';
import {
  logAuthentication,
  logSecurityEvent,
  SecurityEventSeverity,
  SecurityEventType,
} from '@/lib/security-audit';
import type {
  ExtendedSession,
  ExtendedJWT,
  GitHubProfile,
  TokenValidation,
  AuthError,
} from '@/types/auth';

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module 'next-auth' {
  interface Session extends ExtendedSession {}
}

declare module '@auth/core/jwt' {
  interface JWT extends ExtendedJWT {}
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    GitHubProvider({
      clientId: env.GITHUB_CLIENT_ID ?? '',
      clientSecret: env.GITHUB_CLIENT_SECRET ?? '',
      authorization: {
        params: {
          // Use scope management for proper permission control
          scope: getScopeConfiguration(),
        },
      },
    }),
  ],
  callbacks: {
    session: ({ session, token }): ExtendedSession => ({
      ...session,
      user: {
        ...session.user,
        id: token.sub ?? '',
        githubId: token.githubId,
        username: token.username,
      },
      accessToken: token.accessToken,
    }),
    jwt: async ({ token, account, profile, trigger }): Promise<ExtendedJWT> => {
      // Handle fresh sign-in or account change
      if (account?.provider === 'github' && profile) {
        const githubProfile = profile as GitHubProfile;
        token.githubId = String(githubProfile.id);
        token.username = githubProfile.login;
        token.accessToken = account.access_token;

        // Mark this as a fresh login to ensure token update
        token.freshLogin = true;
      }

      // Clear fresh login flag after first use
      if (token.freshLogin && trigger !== 'signIn') {
        delete token.freshLogin;
      }

      return token;
    },
    signIn: async ({ account, profile }: { account: Account | null; profile?: Profile }): Promise<boolean> => {
      if (account?.provider === 'github' && profile) {
        const githubProfile = profile as GitHubProfile;
        // Validate token scopes with proper error handling
        if (account.access_token) {
          let validation: TokenValidation;
          try {
            validation = await validateTokenScopes(account.access_token);
          } catch (error) {
            // Log token validation error but don't block sign-in
            logSecurityEvent(
              SecurityEventType.TOKEN_VALIDATION_FAILED,
              'Token validation failed during sign-in',
              {
                userId: String(githubProfile.id),
                severity: SecurityEventSeverity.ERROR,
                error: error instanceof Error ? error.message : String(error),
              },
            );
            // Allow sign-in to continue with basic validation
            validation = { valid: true, scopes: [], missing: [] };
          }

          if (!validation.valid) {
            // Log security event for missing scopes
            logSecurityEvent(
              SecurityEventType.TOKEN_VALIDATION_FAILED,
              'Token missing required scopes',
              {
                userId: String(githubProfile.id),
                severity: SecurityEventSeverity.WARNING,
                metadata: { missingScopes: validation.missing },
              },
            );
            // Still allow sign-in but log the issue
          }

          // Log scope usage for security auditing
          try {
            logScopeUsage(String(githubProfile.id), validation.scopes, 'signin');
          } catch (error) {
            // Log error but don't fail sign-in
            console.warn('[AUTH] Failed to log scope usage:', error);
          }
        }

        // Always store/update GitHub access token for each sign-in (handles account switching)
        if (account.access_token) {
          try {
            const { ConvexHttpClient } = await import('convex/browser');
            const { api } = await import('@convex/generated/api');
            const { safeObfuscate } = await import('@/lib/simple-crypto');

            const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? '';
            const client = new ConvexHttpClient(convexUrl);

            // Create or update user with GitHub token - this handles account switching
            await client.mutation(api.users.createOrUpdateUser, {
              githubId: String(githubProfile.id),
              username: githubProfile.login || githubProfile.name || 'Unknown',
              email: githubProfile.email ?? undefined,
              avatarUrl: githubProfile.avatar_url ?? undefined,
            });

            // Always update the GitHub access token (fresh token for account switching)
            const obfuscatedToken = safeObfuscate(account.access_token);
            await client.mutation(api.users.updateGitHubToken, {
              githubId: String(githubProfile.id),
              accessToken: obfuscatedToken,
            });

            // Log successful authentication
            logAuthentication(String(githubProfile.id), true, {
              provider: 'github',
              username: githubProfile.login || githubProfile.name || 'Unknown',
            });
          } catch (error) {
            // Log the error but don't block sign-in
            const authError: AuthError = {
              name: 'AuthError',
              type: 'TOKEN_ERROR',
              message: 'Failed to store GitHub token',
              cause: error,
            };
            
            logSecurityEvent(SecurityEventType.TOKEN_CREATED, authError.message, {
              userId: String(githubProfile.id),
              severity: SecurityEventSeverity.ERROR,
              result: 'failure',
              error: authError.message,
              metadata: { originalError: error instanceof Error ? error.message : String(error) },
            });
          }
        }
        return true;
      }
      return true;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  // Force re-authentication to ensure fresh tokens
  events: {
    async signOut({ token }): Promise<void> {
      // Clean up any cached tokens or user data
      if (token?.githubId) {
        try {
          logAuthentication(token.githubId, false, {
            provider: 'github',
            reason: 'user_signout',
          });
        } catch (error) {
          console.warn('[AUTH] Failed to log sign out:', error);
        }
      }
    },
    async signIn({ user, account, profile }): Promise<void> {
      // Log successful sign-in events
      if (account?.provider === 'github' && profile) {
        const githubProfile = profile as GitHubProfile;
        console.info('[AUTH] User signed in:', {
          userId: githubProfile.id,
          username: githubProfile.login,
          provider: account.provider,
        });
      }
    },
  },
} satisfies NextAuthConfig;
