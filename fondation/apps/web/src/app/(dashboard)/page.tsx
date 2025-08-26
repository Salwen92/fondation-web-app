import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { logger } from "@/lib/logger";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Use the user ID from session (which comes from GitHub) as githubId
  const githubId = session.user.githubId ?? session.user.id ?? "unknown";
  const userName = session.user.name ?? "User";
  
  logger.info("Session data", { githubId, userName, session });

  return (
    <DashboardContent
      githubId={githubId}
      userName={userName}
    />
  );
}
