"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { 
  GitBranch, 
  Book, 
  Star, 
  GitFork, 
  Code2, 
  Sparkles,
  ExternalLink,
  FileText,
  Clock,
  Mail,
  Cpu,
  CheckCircle,
  Loader2
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
  const [showWarning, setShowWarning] = useState(false);
  const generateCourse = useMutation(api.jobs.create);
  const latestJob = useQuery(api.jobs.getJobByRepository, { repositoryId: repo._id });
  
  const languages = ["TypeScript", "React", "Node.js"]; // Mock data - should come from GitHub API
  const stats = {
    stars: Math.floor(Math.random() * 1000),
    forks: Math.floor(Math.random() * 100),
    docs: Math.floor(Math.random() * 10)
  };

  const handleGenerate = () => {
    setShowWarning(true);
  };

  const confirmGenerate = async () => {
    try {
      const result = await generateCourse({
        userId,
        repositoryId: repo._id,
      });
      
      toast.success(
        "Génération du cours démarrée!",
        {
          description: `Temps estimé: ${result.estimatedMinutes} minutes. Vous recevrez un email à la fin.`,
          duration: 8000,
        }
      );
      setShowWarning(false);
    } catch (error) {
      toast.error("Échec du démarrage de la génération", {
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const isProcessing = latestJob && ["pending", "cloning", "analyzing", "gathering"].includes(latestJob.status);
  const isCompleted = latestJob?.status === "completed";
  const isFailed = latestJob?.status === "failed";

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
    
    return null;
  };

  return (
    <>
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
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-grow">
                {repo.description}
              </p>
            )}

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
                <div className="flex items-center space-x-1">
                  <Star className="h-3.5 w-3.5" />
                  <span>{stats.stars}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <GitFork className="h-3.5 w-3.5" />
                  <span>{stats.forks}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <FileText className="h-3.5 w-3.5" />
                  <span>{stats.docs}</span>
                </div>
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
                    // Navigate to course viewer
                    window.location.href = `/jobs/${latestJob._id}`;
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
                  ) : isFailed ? (
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
              <Button
                variant="outline"
                size="sm"
                className="glass"
              >
                <Code2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Générer un Cours Complet?</AlertDialogTitle>
            <AlertDialogDescription>
              Cela analysera l&apos;ensemble de votre code et générera un cours tutoriel complet en utilisant l&apos;IA avancée.
              
              <div className="mt-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Temps estimé: 30-60 minutes</p>
                    <p className="text-sm text-muted-foreground">Les dépôts plus importants peuvent prendre plus de temps</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Notification par email à la fin</p>
                    <p className="text-sm text-muted-foreground">Vous pouvez fermer cet onglet et revenir plus tard</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Cpu className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Analyse par IA</p>
                    <p className="text-sm text-muted-foreground">Utilise des ressources IA importantes (coûts de tokens appliqués)</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Book className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Génération de cours complet</p>
                    <p className="text-sm text-muted-foreground">Inclut des tutoriels, exemples et contenu interactif</p>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmGenerate}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            >
              Démarrer la Génération
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}