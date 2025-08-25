"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  GitBranch, 
  Book, 
  Code2, 
  Sparkles,
  ExternalLink,
  FileText,
  CheckCircle,
  Loader2,
  X
} from "lucide-react";
import { type Id } from "../../../convex/_generated/dataModel";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

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

export function RepoCard({ repo, userId }: RepoCardProps) {
  const generateCourse = useMutation(api.jobs.create);
  const latestJob = useQuery(api.jobs.getJobByRepository, { repositoryId: repo._id });
  
  // Get actual docs count from latest completed job
  const docsCount = latestJob?.status === "completed" ? latestJob.docsCount ?? 0 : 0;
  
  // TODO: Get real language and stats data from GitHub API
  const languages = ["TypeScript", "React", "Node.js"]; // Mock data - should come from GitHub API

  const handleGenerate = async () => {
    try {
      // First create the job in Convex
      const result = await generateCourse({
        userId,
        repositoryId: repo._id,
        prompt: `Generate comprehensive course documentation for ${repo.name}`,
      });
      
      // Then trigger the local Cloud Run service directly from the browser
      if (result.jobId) {
        const response = await fetch("/api/analyze-proxy", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jobId: result.jobId,
            repositoryUrl: `https://github.com/${repo.fullName}`,
            branch: repo.defaultBranch,
            callbackUrl: `http://localhost:3000/api/webhook/job-callback`,
            callbackToken: result.callbackToken,
          }),
        });
        
        if (!response.ok) {
          throw new Error("Échec du démarrage de l'analyse");
        }
        
        const cloudRunResult = await response.json() as unknown;
        console.log("Cloud Run triggered:", cloudRunResult);
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
      // Call the cancel API endpoint
      const response = await fetch(`/api/jobs/${latestJob._id}/cancel`, {
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

  const getStatusBadge = () => {
    if (!latestJob) return null;
    
    if (isProcessing) {
      return (
        <Badge variant="default" className="animate-pulse">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          {latestJob.progress ?? "Traitement"}
        </Badge>
      );
    }
    
    if (isCompleted) {
      return (
        <Badge variant="secondary" className="bg-green-500/10 text-green-500">
          <CheckCircle className="mr-1 h-3 w-3" />
          Cours Prêt
        </Badge>
      );
    }
    
    if (isFailed) {
      return (
        <Badge variant="destructive">
          Génération Échouée
        </Badge>
      );
    }
    
    if (isCanceled) {
      return (
        <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">
          <X className="mr-1 h-3 w-3" />
          Annulé
        </Badge>
      );
    }
    
    return null;
  };

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
              {getStatusBadge()}
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
              {languages.map((lang) => (
                <span 
                  key={lang}
                  className="px-2 py-1 text-xs rounded-full bg-muted/50 text-muted-foreground"
                >
                  {lang}
                </span>
              ))}
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
                {latestJob && (
                  <div className="flex items-center space-x-1">
                    <span className="text-xs">
                      {latestJob.status === "completed" ? "✅" : 
                       latestJob.status === "failed" ? "❌" : 
                       latestJob.status === "canceled" ? "🚫" :
                       "⏳"}
                    </span>
                    <span className="capitalize">{latestJob.status}</span>
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
              <div className="mb-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Étape {latestJob.currentStep ?? 0} sur {latestJob.totalSteps ?? 7}</span>
                  <span>{Math.round(((latestJob.currentStep ?? 0) / (latestJob.totalSteps ?? 7)) * 100)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${((latestJob.currentStep ?? 0) / (latestJob.totalSteps ?? 7)) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {isCompleted ? (
                <Button
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                  size="sm"
                  onClick={() => {
                    // Extract owner and repo name from fullName (e.g. "owner/repo")
                    const [owner, repoName] = repo.fullName.split('/');
                    // Navigate to course viewer using latest alias
                    window.location.href = `/course/${owner}/${repoName}/latest`;
                  }}
                >
                  <Book className="mr-2 h-4 w-4" />
                  Voir le Cours
                </Button>
              ) : (
                <Button
                  onClick={handleGenerate}
                  disabled={!!isProcessing}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                  size="sm"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Génération...
                    </>
                  ) : (isFailed || isCanceled) ? (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Réessayer
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Générer le Cours
                    </>
                  )}
                </Button>
              )}
              
              {/* Cancel button for processing jobs */}
              {isProcessing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="glass border-red-200 hover:bg-red-50 hover:border-red-300"
                >
                  <X className="h-4 w-4 text-red-500" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="glass"
                >
                  <Code2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      </motion.div>
  );
}