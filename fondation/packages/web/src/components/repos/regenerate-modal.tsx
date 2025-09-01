"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/generated/api";
import type { Id } from "@convex/generated/dataModel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { ProgressBar } from "./progress-bar";

interface RegenerateModalProps {
  repository: {
    _id: Id<"repositories">;
    fullName: string;
    userId: Id<"users">;
  };
  isOpen: boolean;
  onClose: () => void;
  onComplete: (jobId: string) => void;
}

export function RegenerateModal({ repository, isOpen, onClose, onComplete }: RegenerateModalProps) {
  const [currentJobId, setCurrentJobId] = useState<Id<"jobs"> | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  
  // Use the NEW atomic regenerate mutation
  const regenerate = useMutation(api.jobs.regenerate);
  
  // Real-time job status (same pattern as repo cards)
  const job = useQuery(api.jobs.getById, 
    currentJobId ? { id: currentJobId } : "skip"
  );

  const handleRegenerate = async () => {
    setIsStarting(true);
    try {
      const result = await regenerate({
        repositoryId: repository._id,
        userId: repository.userId,
        prompt: `Régénérer le cours pour ${repository.fullName}`
      });
      
      setCurrentJobId(result.jobId);
      
      toast.success("Régénération démarrée", {
        description: "Le processus de régénération a commencé."
      });
    } catch (error) {
      toast.error("Erreur", {
        description: error instanceof Error ? error.message : "Impossible de démarrer la régénération"
      });
    } finally {
      setIsStarting(false);
    }
  };

  // Auto-close and complete when job is done
  useEffect(() => {
    if (job?.status === "completed") {
      toast.success("Régénération terminée!", {
        description: "Votre cours a été mis à jour avec succès."
      });
      onComplete(job._id);
      onClose();
    }
  }, [job?.status, job?._id, onComplete, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Régénérer le cours
          </DialogTitle>
          <DialogDescription>
            {repository.fullName}
          </DialogDescription>
        </DialogHeader>

        {!currentJobId ? (
          // Confirmation step - matches project's card style
          <Card className="p-4 space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Cela va remplacer le cours existant
                </p>
                <p className="text-xs text-muted-foreground">
                  La génération prend généralement quelques minutes. L'ancien cours sera remplacé par le nouveau.
                </p>
              </div>
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={handleRegenerate}
                disabled={isStarting}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                size="sm"
              >
                {isStarting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Démarrage...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Régénérer
                  </>
                )}
              </Button>
              <Button variant="ghost" onClick={onClose} size="sm">
                Annuler
              </Button>
            </div>
          </Card>
        ) : (
          // Progress tracking - using existing ProgressBar component
          <div className="space-y-4">
            <Card className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Progression</span>
                  <span className="text-xs text-muted-foreground">
                    {job?.progress || "Initialisation..."}
                  </span>
                </div>
                
                {/* Using project's existing ProgressBar component */}
                <ProgressBar 
                  currentStep={job?.currentStep || 0}
                  totalSteps={job?.totalSteps || 6}
                />
                
                {job?.status === "failed" && (
                  <div className="flex items-center gap-2 text-red-500 text-sm mt-2">
                    <XCircle className="h-4 w-4" />
                    {job.error || "Une erreur s'est produite"}
                  </div>
                )}
              </div>
            </Card>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={onClose} size="sm">
                Réduire
              </Button>
              {job?.status === "failed" && (
                <Button 
                  onClick={() => {
                    setCurrentJobId(null);
                  }}
                  size="sm"
                  variant="outline"
                >
                  Réessayer
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}