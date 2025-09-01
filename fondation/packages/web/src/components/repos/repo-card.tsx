"use client";

import { Card } from "@/components/ui/card";
import { 
  GitBranch, 
  Book, 
  ExternalLink,
  FileText,
} from "lucide-react";
import type { Id } from "@convex/generated/dataModel";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/generated/api";
import { useRouter } from "next/navigation";
import { JobStatusBadge } from "./job-status-badge";
import { ProgressBar } from "./progress-bar";
import { JobActions } from "./job-actions";
import { useJobManagement } from "@/hooks/use-job-management";
import { RegenerateModal } from "./regenerate-modal";
import { useRegenerate } from "@/hooks/use-regenerate";

interface RepoCardProps {
  repo: {
    _id: Id<"repositories">;
    name: string;
    fullName: string;
    description?: string;
    defaultBranch: string;
  };
  userId: Id<"users">;
}

/**
 * Repository card component
 * Displays repository information and job management controls
 */
export function RepoCard({ repo, userId }: RepoCardProps) {
  const router = useRouter();
  const latestJob = useQuery(api.jobs.getJobByRepository, { repositoryId: repo._id });
  const createJob = useMutation(api.jobs.create);
  
  // Get actual docs count from latest completed job
  const docsCount = latestJob?.status === "completed" ? latestJob.docsCount ?? 0 : 0;
  
  // Get languages from repository metadata
  const languages = (repo as any).languages?.all
    ?.slice(0, 3)
    .map((lang: any) => lang.name) ?? [];

  // Use the job management hook
  const { handleGenerate, handleCancel } = useJobManagement({
    userId,
    repositoryId: repo._id,
    repositoryFullName: repo.fullName,
    repositoryName: repo.name,
    defaultBranch: repo.defaultBranch,
  });

  // Use regeneration hook for modal-based regeneration
  const repository = {
    _id: repo._id,
    fullName: repo.fullName,
    userId: userId
  };
  
  const {
    isModalOpen,
    handleRegenerateClick,
    handleComplete,
    handleClose,
    canRegenerate,
    activeJob: regenerationJob,
    isRegenerating
  } = useRegenerate(repository, {
    onComplete: (newJobId) => {
      const [owner, repoName] = repo.fullName.split('/');
      window.location.href = `/course/${owner}/${repoName}/${newJobId}`;
    }
  });
  
  // Handle view course action
  const handleViewCourse = () => {
    if (latestJob?._id) {
      const [owner, repoName] = repo.fullName.split('/');
      window.location.href = `/course/${owner}/${repoName}/${latestJob._id}`;
    }
  };

  // Handle test analysis - now uses proper job queue
  const handleTest = async () => {
    try {
      const result = await createJob({
        userId,
        repositoryId: repo._id,
        prompt: `Test analysis for ${repo.fullName}`,
      });
      
      // Navigate to course view with the new job
      const [owner, repoName] = repo.fullName.split('/');
      router.push(`/course/${owner}/${repoName}/${result.jobId}`);
    } catch (error) {
      console.error("Failed to create test job:", error);
    }
  };

  // Job status calculations - prioritize any active job 
  // If there's a regeneration job in progress, use it; otherwise use the latest job
  const currentJob = (isRegenerating && regenerationJob) ? regenerationJob : latestJob;
  
  // Check if the latest job is actually running (real-time tracking)
  const isLatestJobRunning = latestJob && ["pending", "claimed", "cloning", "analyzing", "gathering", "running"].includes(latestJob.status);
  const isProcessing = isLatestJobRunning || (isRegenerating && regenerationJob && ["pending", "claimed", "cloning", "analyzing", "gathering", "running"].includes(regenerationJob.status));
  
  const isCompleted = currentJob?.status === "completed";
  const isFailed = currentJob?.status === "failed" || currentJob?.status === "dead";
  const isCanceled = currentJob?.status === "canceled";

  return (
    <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="glass glass-hover h-full backdrop-blur-xl transition-all duration-300 overflow-hidden group">
          {/* Gradient border effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative p-6 h-full flex flex-col">
            {/* Header */}
            <div className="mb-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20">
                    <Book className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{repo.name}</h3>
                    <p className="text-xs text-muted-foreground">{repo.fullName}</p>
                  </div>
                </div>
                <a 
                  href={`https://github.com/${repo.fullName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              </div>
              <JobStatusBadge 
                status={currentJob?.status} 
                progress={currentJob?.progress} 
              />
            </div>

            {/* Description */}
            {repo.description && (
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {repo.description}
              </p>
            )}

            {/* Flexible spacer to push actions to bottom */}
            <div className="flex-grow" />

            {/* Languages */}
            <div className="flex flex-wrap gap-1 mb-4">
              {languages.length > 0 ? languages.map((lang: string) => (
                <span 
                  key={lang}
                  className="px-2 py-1 text-xs rounded-full bg-muted/50 text-muted-foreground"
                >
                  {lang}
                </span>
              )) : (
                <span className="px-2 py-1 text-xs rounded-full bg-muted/50 text-muted-foreground italic">
                  No languages detected
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-3">
                {docsCount > 0 && (
                  <div className="flex items-center space-x-1">
                    <FileText className="h-3.5 w-3.5" />
                    <span>{docsCount} docs</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-1">
                <GitBranch className="h-3.5 w-3.5" />
                <span>{repo.defaultBranch}</span>
              </div>
            </div>

            {/* Progress Bar for active jobs */}
            {isProcessing && currentJob && (
              <ProgressBar 
                currentStep={currentJob.currentStep ?? 0}
                totalSteps={currentJob.totalSteps ?? 6}
                className="mb-4"
              />
            )}

            {/* Actions */}
            <JobActions
              status={currentJob?.status as any}
              isProcessing={!!isProcessing}
              isCompleted={!!isCompleted}
              isFailed={!!isFailed}
              isCanceled={!!isCanceled}
              onGenerate={handleGenerate}
              onCancel={handleCancel}
              onViewCourse={handleViewCourse}
              onRegenerate={isRegenerating ? undefined : handleRegenerateClick} // Disable regenerate during active regeneration
              onTest={handleTest}
              repositoryName={repo.name}
            />
          </div>
        </Card>
        
        {/* Regenerate Modal */}
        <RegenerateModal 
          repository={repository}
          isOpen={isModalOpen}
          onClose={handleClose}
          onComplete={handleComplete}
        />
      </motion.div>
  );
}