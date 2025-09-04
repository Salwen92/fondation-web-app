'use client';

import { Book, Loader2, RefreshCw, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface JobActionsProps {
  status?: string;
  isProcessing: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  isCanceled: boolean;
  onGenerate: () => void;
  onCancel: () => void;
  onViewCourse: () => void;
  onRegenerate?: () => void;
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
  onRegenerate,
  repositoryName,
}: JobActionsProps) {
  return (
    <div className="flex gap-2">
      {isCompleted ? (
        <>
          <Button
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
            size="sm"
            onClick={onViewCourse}
            data-testid="view-course-button"
          >
            <Book className="mr-2 h-4 w-4" />
            Voir le Cours
          </Button>
          {onRegenerate && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              className="glass border-purple-200 hover:bg-purple-50 hover:border-purple-300"
              data-testid="regenerate-button"
            >
              <RefreshCw className="h-4 w-4 text-purple-500" />
            </Button>
          )}
        </>
      ) : (
        <Button
          onClick={onGenerate}
          disabled={isProcessing}
          className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
          size="sm"
          id={
            repositoryName ? `generate-${repositoryName.replace(/[^a-zA-Z0-9]/g, '-')}` : undefined
          }
          data-testid={
            isProcessing
              ? 'generating-button'
              : isFailed || isCanceled
                ? 'retry-button'
                : 'generate-button'
          }
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Génération...
            </>
          ) : isFailed || isCanceled ? (
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
      ) : null}
    </div>
  );
}
