import { auth } from "@/server/auth";
import { Card } from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Dashboard</h2>
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-2">Welcome back, {session?.user?.name}!</h3>
        <p className="text-muted-foreground">
          You are successfully logged in. Repository listing will be implemented in Phase 1.2.
        </p>
      </Card>
    </div>
  );
}