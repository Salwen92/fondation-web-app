"use client";

import { Button } from "@/components/ui/button";
import { Book, Code2, Loader2, Sparkles, X } from "lucide-react";

interface JobActionsProps {
  status?: string;
  isProcessing: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  isCanceled: boolean;
  onGenerate: () => void;
  onCancel: () => void;
  onViewCourse: () => void;
  repositoryName?: string;
}

/**
 * Component to render job action buttons
 * Shows different actions based on job status
 */
export function JobActions({
  isProcessing,
  isCompleted,
  isFailed,
  isCanceled,
  onGenerate,
  onCancel,
  onViewCourse,
  repositoryName,
}: JobActionsProps) {
  return (
    <div className="flex gap-2">
      {isCompleted ? (
        <Button
          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
          size="sm"
          onClick={onViewCourse}
          data-testid="view-course-button"
        >
          <Book className="mr-2 h-4 w-4" />
          Voir le Cours
        </Button>
      ) : (
        <Button
          onClick={onGenerate}
          disabled={isProcessing}
          className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
          size="sm"
          id={repositoryName ? `generate-${repositoryName.replace(/[^a-zA-Z0-9]/g, '-')}` : undefined}
          data-testid={isProcessing ? "generating-button" : (isFailed || isCanceled) ? "retry-button" : "generate-button"}
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
          onClick={onCancel}
          className="glass border-red-200 hover:bg-red-50 hover:border-red-300"
          data-testid="cancel-button"
        >
          <X className="h-4 w-4 text-red-500" />
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="glass"
          data-testid="code-button"
        >
          <Code2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}