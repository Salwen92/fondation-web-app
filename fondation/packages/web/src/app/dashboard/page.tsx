import { redirect } from 'next/navigation';
import { DashboardContent } from '@/components/dashboard/dashboard-content';
import { auth } from '@/server/auth';

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // Ensure githubId exists, fallback gracefully if needed
  const githubId = session.user?.githubId || session.user?.id;

  return <DashboardContent githubId={githubId} userName={session.user.name} />;
}
