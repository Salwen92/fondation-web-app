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
    jwt: async ({ token, account, profile }) => {
      if (account?.provider === "github" && profile) {
        token.githubId = String(profile.id);
        token.accessToken = account.access_token;
      }
      return token;
    },
    signIn: async ({ account, profile }) => {
      if (account?.provider === "github" && profile) {
        // User creation will be handled client-side after sign-in
        return true;
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;
