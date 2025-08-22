import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.githubId) {
    redirect("/login");
  }

  return (
    <DashboardContent 
      githubId={session.user.githubId} 
      userName={session.user.name}
    />
  );
}