/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import path from 'path';

/** @type {import("next").NextConfig} */
const config = {
  experimental: {
    externalDir: true,
    turbo: {
      resolveAlias: {
        '@convex': path.resolve(process.cwd(), '../../convex'),
        '@convex/generated': path.resolve(process.cwd(), '../../convex/_generated'),
        '@fondation/shared': path.resolve(process.cwd(), '../shared/src'),
      },
    },
  },
  transpilePackages: ['@fondation/shared'],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@convex': path.resolve(process.cwd(), '../../convex'),
      '@convex/generated': path.resolve(process.cwd(), '../../convex/_generated'),
      '@fondation/shared': path.resolve(process.cwd(), '../shared/src'),
    };
    return config;
  },
};

export default config;
