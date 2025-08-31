"use client";

import { Card } from "@/components/ui/card";
import { 
  GitBranch, 
  Book, 
  ExternalLink,
  FileText,
} from "lucide-react";
import { type Id } from "@convex/generated/dataModel";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/generated/api";
import { useRouter } from "next/navigation";
import { JobStatusBadge } from "./job-status-badge";
import { ProgressBar } from "./progress-bar";
import { JobActions } from "./job-actions";
import { useJobManagement } from "@/hooks/use-job-management";
import { translateStatus, getStatusEmoji } from "@/lib/translations";

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
  const startAnalysis = useMutation(api.jobs.startAnalysis);
  
  // Get actual docs count from latest completed job
  const docsCount = latestJob?.status === "completed" ? latestJob.docsCount ?? 0 : 0;
  
  // Get languages from repository metadata
  const languages = repo.languages?.all
    ?.slice(0, 3)
    .map(lang => lang.name) ?? [];

  // Use the job management hook
  const { handleGenerate, handleCancel } = useJobManagement({
    userId,
    repositoryId: repo._id,
    repositoryFullName: repo.fullName,
    repositoryName: repo.name,
    defaultBranch: repo.defaultBranch,
  });
  
  // Handle view course action
  const handleViewCourse = () => {
    if (latestJob?._id) {
      const [owner, repoName] = repo.fullName.split('/');
      window.location.href = `/course/${owner}/${repoName}/${latestJob._id}`;
    }
  };

  // Handle test analysis
  const handleTest = async () => {
    try {
      const { jobId } = await startAnalysis({
        repositoryId: repo._id,
        userId,
        repoUrl: `https://github.com/${repo.fullName}`,
      });
      
      // Navigate to job detail page
      router.push(`/jobs/${jobId}`);
    } catch (error) {
      console.error("Failed to start test analysis:", error);
    }
  };

  // Job status calculations
  const isProcessing = latestJob && ["pending", "cloning", "analyzing", "gathering", "running"].includes(latestJob.status);
  const isCompleted = latestJob?.status === "completed";
  const isFailed = latestJob?.status === "failed";
  const isCanceled = latestJob?.status === "canceled";

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
                status={latestJob?.status} 
                progress={latestJob?.progress} 
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
              {languages.length > 0 ? languages.map((lang) => (
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
            {isProcessing && latestJob && (
              <ProgressBar 
                currentStep={latestJob.currentStep ?? 0}
                totalSteps={latestJob.totalSteps ?? 7}
                className="mb-4"
              />
            )}

            {/* Actions */}
            <JobActions
              status={latestJob?.status as any}
              isProcessing={!!isProcessing}
              isCompleted={!!isCompleted}
              isFailed={!!isFailed}
              isCanceled={!!isCanceled}
              onGenerate={handleGenerate}
              onCancel={handleCancel}
              onViewCourse={handleViewCourse}
              onTest={handleTest}
              repositoryName={repo.name}
            />
          </div>
        </Card>
      </motion.div>
  );
}