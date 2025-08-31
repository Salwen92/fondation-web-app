import "@/styles/globals.css";

import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Providers } from "@/components/providers";
import { Toaster } from "sonner";
import { ErrorBoundaryWrapper } from "@/components/error-boundary";

export const metadata: Metadata = {
  title: "Fondation - Génération de Documentation par IA",
  description: "Génération automatique de documentation pour vos dépôts avec l'intelligence artificielle",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  keywords: ["documentation", "IA", "GitHub", "génération automatique", "développement"],
  authors: [{ name: "Fondation" }],
  openGraph: {
    title: "Fondation - Documentation par IA",
    description: "Transformez votre code en documentation complète avec l'IA",
    type: "website",
    locale: "fr_FR",
  },
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${geist.variable}`} suppressHydrationWarning>
      <body className="min-h-screen" suppressHydrationWarning>
        <div className="bg-gradient-mesh pointer-events-none fixed inset-0" />
        <ErrorBoundaryWrapper>
          <Providers>{children}</Providers>
        </ErrorBoundaryWrapper>
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
