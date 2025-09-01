import type { DefaultSession, NextAuthConfig } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { env } from "@/env";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      githubId?: string;
    } & DefaultSession["user"];
    accessToken?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    githubId?: string;
    accessToken?: string;
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    GitHubProvider({
      clientId: env.GITHUB_CLIENT_ID ?? "",
      clientSecret: env.GITHUB_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
  ],
  callbacks: {
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.sub ?? "",
        githubId: token.githubId,
      },
      accessToken: token.accessToken,
    }),
    jwt: async ({ token, account, profile, trigger }) => {
      // Handle fresh sign-in or account change
      if (account?.provider === "github" && profile) {
        token.githubId = String(profile.id);
        token.accessToken = account.access_token;
        
        // Mark this as a fresh login to ensure token update
        token.freshLogin = true;
      }
      
      // Clear fresh login flag after first use
      if (token.freshLogin && trigger !== "signIn") {
        delete token.freshLogin;
      }
      
      return token;
    },
    signIn: async ({ account, profile }) => {
      if (account?.provider === "github" && profile) {
        // Always store/update GitHub access token for each sign-in (handles account switching)
        if (account.access_token) {
          try {
            const { ConvexHttpClient } = await import("convex/browser");
            const { api } = await import("@convex/generated/api");
            const { safeObfuscate } = await import("@/lib/simple-crypto");
            
            const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? "";
            const client = new ConvexHttpClient(convexUrl);
            
            // Create or update user with GitHub token - this handles account switching
            await client.mutation(api.users.createOrUpdateUser, {
              githubId: String(profile.id),
              username: String(profile.login || profile.name || "Unknown"),
              email: profile.email ?? undefined,
              avatarUrl: profile.avatar_url as string | undefined,
            });
            
            // Always update the GitHub access token (fresh token for account switching)
            const obfuscatedToken = safeObfuscate(account.access_token);
            await client.mutation(api.users.updateGitHubToken, {
              githubId: String(profile.id),
              accessToken: obfuscatedToken,
            });
          } catch (_error) {
            // Don't block sign-in if token storage fails
          }
        }
        return true;
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  // Force re-authentication to ensure fresh tokens
  events: {
    async signOut() {
    },
  },
} satisfies NextAuthConfig;
