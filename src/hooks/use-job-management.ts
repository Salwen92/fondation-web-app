"use client";

import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { type Id } from "../../convex/_generated/dataModel";
import { env } from "@/env";
import { withRetry } from "@/lib/retry";
import { getUserFriendlyError } from "@/lib/error-messages";

interface UseJobManagementProps {
  userId: Id<"users">;
  repositoryId: Id<"repositories">;
  repositoryFullName: string;
  repositoryName: string;
  defaultBranch: string;
  latestJobId?: Id<"jobs">;
}

/**
 * Custom hook for managing job operations
 * Encapsulates job generation and cancellation logic
 */
export function useJobManagement({
  userId,
  repositoryId,
  repositoryFullName,
  repositoryName,
  defaultBranch,
  latestJobId
}: UseJobManagementProps) {
  const generateCourse = useMutation(api.jobs.create);

  const handleGenerate = async () => {
    try {
      // First create the job in Convex
      const result = await generateCourse({
        userId,
        repositoryId,
        prompt: `Generate comprehensive course documentation for ${repositoryName}`,
      });
      
      // Then trigger the Scaleway Gateway service with retry
      if (result.jobId) {
        await withRetry(
          async () => {
            const response = await fetch("/api/analyze-proxy", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                jobId: result.jobId,
                repositoryUrl: `https://github.com/${repositoryFullName}`,
                branch: defaultBranch,
                callbackUrl: `${env.NEXT_PUBLIC_APP_URL}/api/webhook/job-callback`,
                callbackToken: result.callbackToken,
              }),
            });
            
            if (!response.ok) {
              throw new Error("Échec du démarrage de l'analyse");
            }
            
            // Gateway response is logged for debugging but not shown to user
            await response.json();
          },
          {
            maxAttempts: 3,
            initialDelay: 1000,
            onRetry: (_error, attempt) => {
              toast.info(`Nouvelle tentative (${attempt}/3)...`);
            },
          }
        );
      }
      
      toast.success(
        "Génération du cours démarrée!",
        {
          description: `Job ID: ${result.jobId}. Vous recevrez un email à la fin.`,
          duration: 8000,
        }
      );
    } catch (error) {
      const friendlyMessage = getUserFriendlyError(error);
      toast.error("Échec du démarrage de la génération", {
        description: friendlyMessage,
      });
    }
  };

  const handleCancel = async () => {
    if (!latestJobId) return;
    
    try {
      // Call the cancel API endpoint
      const response = await fetch(`/api/jobs/${latestJobId}/cancel`, {
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
      const friendlyMessage = getUserFriendlyError(error);
      toast.error("Échec de l'annulation", {
        description: friendlyMessage,
      });
    }
  };

  const handleViewCourse = () => {
    // Extract owner and repo name from fullName (e.g. "owner/repo")
    const [owner, repoName] = repositoryFullName.split('/');
    // Navigate to course viewer using latest alias
    window.location.href = `/course/${owner}/${repoName}/latest`;
  };

  return {
    handleGenerate,
    handleCancel,
    handleViewCourse,
  };
}