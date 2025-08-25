import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Use the user ID from session (which comes from GitHub) as githubId
  const githubId = session.user.githubId ?? session.user.id ?? "unknown";
  const userName = session.user.name ?? "User";
  
  if (process.env.NODE_ENV === "development") {
    console.log("Session data:", { githubId, userName });
  }

  return (
    <DashboardContent
      githubId={githubId}
      userName={userName}
    />
  );
}
