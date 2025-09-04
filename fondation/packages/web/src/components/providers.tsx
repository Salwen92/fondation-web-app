'use client';

import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <ConvexProvider client={convex}>
        <SessionProvider>{children}</SessionProvider>
      </ConvexProvider>
    </ThemeProvider>
  );
}
