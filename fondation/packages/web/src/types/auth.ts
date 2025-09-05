/**
 * Authentication system type definitions
 * Provides comprehensive typing for authentication flow, session management, and user data
 */

import type { DefaultSession } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

/**
 * Extended user interface for NextAuth sessions
 * Includes GitHub-specific data and access tokens
 */
export interface ExtendedUser extends DefaultSession['user'] {
  /** Internal user ID */
  id: string;
  /** GitHub user ID for API calls */
  githubId?: string;
  /** GitHub username */
  username?: string;
  /** User email address */
  email?: string;
  /** Avatar image URL */
  image?: string;
  /** Full name */
  name?: string;
}

/**
 * Extended session interface for NextAuth
 * Includes access tokens and GitHub-specific user data
 */
export interface ExtendedSession extends Omit<DefaultSession, 'user'> {
  user: ExtendedUser;
  /** GitHub OAuth access token for API calls */
  accessToken?: string;
  /** Token expiry timestamp */
  expires: string;
}

/**
 * Extended JWT interface for NextAuth
 * Stores GitHub-specific data and access tokens
 */
export interface ExtendedJWT extends JWT {
  /** GitHub user ID */
  githubId?: string;
  /** GitHub OAuth access token */
  accessToken?: string;
  /** GitHub username */
  username?: string;
  /** Flag to track fresh login for token updates */
  freshLogin?: boolean;
}

/**
 * GitHub OAuth profile from NextAuth provider
 * Represents the user profile returned by GitHub during OAuth
 */
export interface GitHubProfile {
  /** GitHub user ID */
  id: number;
  /** GitHub username/login */
  login: string;
  /** Full name */
  name?: string;
  /** Email address */
  email?: string;
  /** Avatar image URL */
  avatar_url?: string;
  /** GitHub profile URL */
  html_url?: string;
  /** Profile bio */
  bio?: string;
  /** Company */
  company?: string;
  /** Location */
  location?: string;
  /** Public repositories count */
  public_repos?: number;
  /** Account creation date */
  created_at?: string;
  /** Last updated date */
  updated_at?: string;
}

/**
 * Authentication state enumeration
 * Represents the different states of user authentication
 */
export enum AuthState {
  LOADING = 'loading',
  AUTHENTICATED = 'authenticated',
  UNAUTHENTICATED = 'unauthenticated',
  ERROR = 'error',
}

/**
 * Authentication context interface
 * Provides typed context for authentication state management
 */
export interface AuthContextType {
  /** Current authentication state */
  state: AuthState;
  /** Current user session */
  session: ExtendedSession | null;
  /** User authentication status */
  isAuthenticated: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Sign in function */
  signIn: () => Promise<void>;
  /** Sign out function */
  signOut: () => Promise<void>;
  /** Refresh session function */
  refreshSession: () => Promise<void>;
}

/**
 * Route protection interface
 * Defines the configuration for protected routes
 */
export interface RouteProtection {
  /** Whether the route requires authentication */
  requireAuth: boolean;
  /** Redirect URL for unauthenticated users */
  redirectTo?: string;
  /** Allowed user roles */
  allowedRoles?: string[];
  /** Custom authorization check */
  customCheck?: (session: ExtendedSession) => boolean;
}

/**
 * Authentication error interface
 * Standardized error structure for authentication failures
 */
export interface AuthError extends Error {
  /** Error type/code */
  type: 'SIGNIN_ERROR' | 'SIGNOUT_ERROR' | 'TOKEN_ERROR' | 'CALLBACK_ERROR' | 'UNAUTHORIZED';
  /** Human-readable error message */
  message: string;
  /** Original error cause */
  cause?: unknown;
  /** Additional error metadata */
  metadata?: Record<string, unknown>;
}

/**
 * GitHub API token validation result
 * Result from validating GitHub access tokens
 */
export interface TokenValidation {
  /** Whether the token is valid */
  valid: boolean;
  /** Available scopes */
  scopes: string[];
  /** Missing required scopes */
  missing: string[];
  /** Token expiry date */
  expiresAt?: Date;
  /** Rate limit information */
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: Date;
  };
}

/**
 * User creation/update data for Convex
 * Data structure for creating or updating users in the database
 */
export interface UserCreationData {
  /** GitHub user ID */
  githubId: string;
  /** Username */
  username: string;
  /** Email address */
  email?: string;
  /** Avatar image URL */
  avatarUrl?: string;
  /** Full name */
  name?: string;
}

/**
 * Session validation result
 * Result from validating user sessions
 */
export interface SessionValidation {
  /** Whether the session is valid */
  isValid: boolean;
  /** Validation error if any */
  error?: string;
  /** User data from session */
  user?: ExtendedUser;
  /** Whether token needs refresh */
  needsRefresh: boolean;
}

/**
 * Authentication configuration interface
 * Configuration options for the authentication system
 */
export interface AuthConfig {
  /** GitHub OAuth client ID */
  githubClientId: string;
  /** GitHub OAuth client secret */
  githubClientSecret: string;
  /** NextAuth secret */
  nextAuthSecret: string;
  /** Convex URL */
  convexUrl: string;
  /** Session configuration */
  session: {
    /** Session strategy */
    strategy: 'jwt' | 'database';
    /** Session max age in seconds */
    maxAge: number;
    /** Update age threshold */
    updateAge: number;
  };
  /** JWT configuration */
  jwt: {
    /** JWT max age in seconds */
    maxAge: number;
    /** JWT secret */
    secret: string;
  };
  /** Callback URLs */
  callbacks: {
    /** Sign in callback URL */
    signIn: string;
    /** Error callback URL */
    error: string;
  };
}