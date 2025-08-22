"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { RepositoryList } from "@/components/repos/repository-list";
import { Card } from "@/components/ui/card";

interface DashboardContentProps {
  githubId: string;
  userName?: string | null;
}

export function DashboardContent({ githubId, userName }: DashboardContentProps) {
  const user = useQuery(api.users.getUserByGithubId, { githubId });

  if (!user) {
    return (
      <div>
        <h2 className="mb-6 text-3xl font-bold">Dashboard</h2>
        <Card className="p-6">
          <h3 className="mb-2 text-lg font-semibold">
            Welcome back, {userName}!
          </h3>
          <p className="text-muted-foreground">
            Setting up your account...
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-6 text-3xl font-bold">Dashboard</h2>
      <RepositoryList userId={user._id} />
    </div>
  );
}