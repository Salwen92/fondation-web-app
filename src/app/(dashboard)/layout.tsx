import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { UserMenu } from "@/components/auth/user-menu";
import { UserSync } from "@/components/auth/user-sync";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="bg-background min-h-screen">
      <UserSync />
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold">Fondation</h1>
          <UserMenu session={session} />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
