'use client';

import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error('NEXT_PUBLIC_CONVEX_URL environment variable is not set');
}
const convex = new ConvexReactClient(convexUrl);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <ConvexProvider client={convex}>
        <SessionProvider>{children}</SessionProvider>
      </ConvexProvider>
    </ThemeProvider>
  );
}
