import { redirect } from 'next/navigation';
import { UserMenu } from '@/components/auth/user-menu';
import { UserSync } from '@/components/auth/user-sync';
import { auth } from '@/server/auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen">
      <UserSync />
      <header className="glass border-border/40 sticky top-0 z-50 border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg">
              <span className="text-gradient text-lg font-bold">F</span>
            </div>
            <h1 className="text-xl font-bold">Fondation</h1>
          </div>
          <UserMenu session={session} />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="bg-gradient-radial absolute inset-0 -z-10" />
        {children}
      </main>
    </div>
  );
}
