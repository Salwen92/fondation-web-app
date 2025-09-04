import { FileText, FolderGit2, Home, Settings, Terminal, Zap } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { UserMenu } from '@/components/auth/user-menu';
import { UserSync } from '@/components/auth/user-sync';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';
import { auth } from '@/server/auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="bg-background min-h-screen relative">
      <UserSync />

      {/* Background gradient effects */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-br from-purple-500/10 to-pink-500/10 blur-3xl dark:from-purple-500/5 dark:to-pink-500/5" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-gradient-to-tr from-blue-500/10 to-cyan-500/10 blur-3xl dark:from-blue-500/5 dark:to-cyan-500/5" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 backdrop-blur-xl bg-background/70">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-8">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="relative">
                <div className="absolute inset-0 animate-pulse rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 blur-md opacity-50" />
                <Terminal className="relative h-8 w-8 text-purple-500" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                Fondation
              </span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link
                href="/dashboard"
                className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Home className="h-4 w-4" />
                <span>Tableau de bord</span>
              </Link>
              <Link
                href="/dashboard/repositories"
                className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <FolderGit2 className="h-4 w-4" />
                <span>Dépôts</span>
              </Link>
              <Link
                href="/dashboard/docs"
                className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <FileText className="h-4 w-4" />
                <span>Documentation</span>
              </Link>
              <Link
                href="/dashboard/settings"
                className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span>Paramètres</span>
              </Link>
            </nav>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            <button className="relative p-2 rounded-lg glass hover:bg-muted/50 transition-colors">
              <Zap className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse" />
            </button>
            <ThemeSwitcher />
            <UserMenu session={session} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
