import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    NEXTAUTH_SECRET: z.string().optional(),
    NEXTAUTH_URL: z.string().url().optional(),
    GITHUB_CLIENT_ID:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    GITHUB_CLIENT_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    ENCRYPTION_KEY:
      process.env.NODE_ENV === "production"
        ? z.string().length(64) // 32 bytes in hex = 64 characters
        : z.string().optional(),
    // Scaleway configuration for production job triggering
    SCW_ACCESS_KEY:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    SCW_SECRET_KEY:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    SCW_DEFAULT_PROJECT_ID:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    SCW_DEFAULT_ZONE: z.string().default("fr-par-1"),
    SCW_JOB_DEFINITION_ID:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_CONVEX_URL:
      process.env.NODE_ENV === "production"
        ? z.string().url()
        : z.string().url().optional(),
    NEXT_PUBLIC_APP_URL:
      process.env.NODE_ENV === "production"
        ? z.string().url()
        : z.string().url().default("http://localhost:3000"),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    // Scaleway runtime environment variables
    SCW_ACCESS_KEY: process.env.SCW_ACCESS_KEY,
    SCW_SECRET_KEY: process.env.SCW_SECRET_KEY,
    SCW_DEFAULT_PROJECT_ID: process.env.SCW_DEFAULT_PROJECT_ID,
    SCW_DEFAULT_ZONE: process.env.SCW_DEFAULT_ZONE,
    SCW_JOB_DEFINITION_ID: process.env.SCW_JOB_DEFINITION_ID,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
