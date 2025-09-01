import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/generated/api";
import { toast } from "sonner";
import type { Id } from "@convex/generated/dataModel";

interface UseJobManagementOptions {
  repositoryId: Id<"repositories">;
  userId: Id<"users">;
  repositoryFullName: string;
  repositoryName: string;
  defaultBranch: string;
}

export function useJobManagement({
  repositoryId,
  userId,
  repositoryFullName,
  repositoryName,
  defaultBranch,
}: UseJobManagementOptions) {
  const generateCourse = useMutation(api.jobs.create);
  const updateMetadata = useMutation(api.github.updateRepositoryMetadata);
  const latestJob = useQuery(api.jobs.getJobByRepository, { repositoryId });
  const repoWithMetadata = useQuery(api.github.getRepositoryWithMetadata, { repositoryId });

  const handleGenerate = async () => {
    try {
      // Create the job in Convex - workers will claim it from the queue
      const result = await generateCourse({
        userId,
        repositoryId,
        prompt: `Generate comprehensive course documentation for ${repositoryName}`,
      });
      
      // Job is now in the queue, workers will pick it up automatically
      if (result.jobId) {
        // Update local metadata to show job is in progress
        await updateMetadata({
          repositoryId,
          lastAnalyzedAt: Date.now(),
        });
        
        toast.success(
          "Documentation generation started!",
          {
            description: `Job ID: ${result.jobId}. The analysis will begin shortly.`,
            duration: 8000,
          }
        );
      }
    } catch (error) {
      toast.error("Failed to start generation", {
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };

  const handleCancel = async () => {
    if (!latestJob) { return; }
    
    try {
      const response = await fetch(`/api/jobs/${latestJob._id}/cancel`, {
        method: "POST",
      });
      
      if (!response.ok) {
        const error = await response.json() as { error?: string };
        throw new Error(error.error ?? "Failed to cancel job");
      }
      
      toast.success("Generation cancelled", {
        description: "The documentation generation has been cancelled.",
      });
    } catch (error) {
      toast.error("Failed to cancel", {
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };

  const isProcessing = latestJob && ["pending", "claimed", "cloning", "analyzing", "gathering", "running"].includes(latestJob.status);
  const isCompleted = latestJob?.status === "completed";
  const isFailed = latestJob?.status === "failed" || latestJob?.status === "dead";
  const isCanceled = latestJob?.status === "canceled";

  return {
    latestJob,
    repoWithMetadata,
    updateMetadata,
    handleGenerate,
    handleCancel,
    isProcessing: !!isProcessing,
    isCompleted: !!isCompleted,
    isFailed: !!isFailed,
    isCanceled: !!isCanceled,
  };
}