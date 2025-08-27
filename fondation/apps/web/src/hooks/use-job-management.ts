import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { getJobCallbackUrl } from "@/lib/config";
import { fetchWithRetry } from "@/lib/retry";
import type { Id } from "../../convex/_generated/dataModel";

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
      // First create the job in Convex
      const result = await generateCourse({
        userId,
        repositoryId,
        prompt: `Generate comprehensive course documentation for ${repositoryName}`,
      });
      
      // Then trigger the Worker Gateway service
      if (result.jobId) {
        const response = await fetchWithRetry("/api/analyze-proxy", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jobId: result.jobId,
            repositoryUrl: `https://github.com/${repositoryFullName}`,
            branch: defaultBranch,
            callbackUrl: getJobCallbackUrl(),
            callbackToken: result.callbackToken,
          }),
        });
        
        if (!response.ok) {
          throw new Error("Échec du démarrage de l'analyse");
        }
        
        const gatewayResult = await response.json() as unknown;
        console.log("Worker Gateway triggered:", gatewayResult);
      }
      
      toast.success(
        "Génération du cours démarrée!",
        {
          description: `Job ID: ${result.jobId}. Vous recevrez un email à la fin.`,
          duration: 8000,
        }
      );
    } catch (error) {
      toast.error("Échec du démarrage de la génération", {
        description: error instanceof Error ? error.message : "Une erreur inconnue s'est produite",
      });
    }
  };

  const handleCancel = async () => {
    if (!latestJob) return;
    
    try {
      const response = await fetchWithRetry(`/api/jobs/${latestJob._id}/cancel`, {
        method: "POST",
      });
      
      if (!response.ok) {
        const error = await response.json() as { error?: string };
        throw new Error(error.error ?? "Échec de l'annulation");
      }
      
      toast.success("Génération annulée", {
        description: "La génération du cours a été annulée.",
      });
    } catch (error) {
      toast.error("Échec de l'annulation", {
        description: error instanceof Error ? error.message : "Une erreur inconnue s'est produite",
      });
    }
  };

  const isProcessing = latestJob && ["pending", "cloning", "analyzing", "gathering", "running"].includes(latestJob.status);
  const isCompleted = latestJob?.status === "completed";
  const isFailed = latestJob?.status === "failed";
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