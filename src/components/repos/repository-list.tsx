"use client";

import { useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { RepoCard } from "./repo-card";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { type Id } from "../../../convex/_generated/dataModel";

interface RepositoryListProps {
  userId: Id<"users">;
}

export function RepositoryList({ userId }: RepositoryListProps) {
  const { data: session } = useSession();
  const [isGenerating, setIsGenerating] = useState<Id<"repositories"> | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  
  const repositories = useQuery(api.repositories.listUserRepositories, { userId });
  const fetchRepositories = useAction(api.repositories.fetchGitHubRepositories);
  const createJob = useMutation(api.jobs.create);

  const handleFetchRepositories = async () => {
    if (!session?.accessToken) {
      toast.error("No access token available");
      return;
    }

    setIsFetching(true);
    try {
      await fetchRepositories({
        accessToken: session.accessToken,
        userId,
      });
      toast.success("Repositories fetched successfully");
    } catch (error) {
      console.error("Error fetching repositories:", error);
      toast.error("Failed to fetch repositories");
    } finally {
      setIsFetching(false);
    }
  };

  const handleGenerateDocs = async (repositoryId: Id<"repositories">) => {
    setIsGenerating(repositoryId);
    try {
      const result = await createJob({
        userId,
        repositoryId,
        prompt: "Generate comprehensive documentation for this repository",
      });
      
      toast.success("Documentation generation started");
      console.log("Job created:", result);
    } catch (error) {
      console.error("Error creating job:", error);
      toast.error("Failed to start documentation generation");
    } finally {
      setIsGenerating(null);
    }
  };

  useEffect(() => {
    if (repositories?.length === 0 && session?.accessToken) {
      void handleFetchRepositories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repositories, session]);

  if (!repositories) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-muted-foreground">Loading repositories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-semibold">Your Repositories</h3>
        <Button
          onClick={handleFetchRepositories}
          disabled={isFetching}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={isFetching ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
          Refresh
        </Button>
      </div>

      {repositories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="mb-4 text-muted-foreground">No repositories found</p>
          <Button onClick={handleFetchRepositories} disabled={isFetching}>
            <RefreshCw className={isFetching ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
            Fetch Repositories from GitHub
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {repositories.map((repo) => (
            <RepoCard
              key={repo._id}
              repo={repo}
              onGenerate={handleGenerateDocs}
              isGenerating={isGenerating === repo._id}
            />
          ))}
        </div>
      )}
    </div>
  );
}