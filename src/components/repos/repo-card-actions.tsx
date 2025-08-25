import { Button } from "@/components/ui/button";
import { Book, Sparkles, Loader2, X, Code2 } from "lucide-react";
import { uiTranslations } from "@/lib/i18n";

interface RepoCardActionsProps {
  repoId: string;
  repoName: string;
  isProcessing: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  isCanceled: boolean;
  onGenerate: () => void;
  onCancel: () => void;
  onViewCourse: () => void;
  onViewSource: () => void;
}

export function RepoCardActions({
  repoId,
  repoName,
  isProcessing,
  isCompleted,
  isFailed,
  isCanceled,
  onGenerate,
  onCancel,
  onViewCourse,
  onViewSource,
}: RepoCardActionsProps) {
  return (
    <div className="flex gap-2">
      {isCompleted ? (
        <Button
          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
          size="sm"
          onClick={onViewCourse}
          aria-label={uiTranslations.viewCourseFor(repoName)}
        >
          <Book className="mr-2 h-4 w-4" aria-hidden="true" />
          {uiTranslations.viewCourse}
        </Button>
      ) : (
        <Button
          onClick={onGenerate}
          disabled={isProcessing}
          className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
          size="sm"
          aria-label={
            isProcessing 
              ? uiTranslations.generationInProgress(repoName)
              : (isFailed || isCanceled) 
                ? uiTranslations.retryGeneration(repoName)
                : uiTranslations.generateCourseFor(repoName)
          }
          aria-describedby={isProcessing ? `progress-${repoId}` : undefined}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              {uiTranslations.generation}
            </>
          ) : (isFailed || isCanceled) ? (
            <>
              <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
              {uiTranslations.retry}
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
              {uiTranslations.generateCourse}
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
          aria-label={uiTranslations.cancelGenerationFor(repoName)}
        >
          <X className="h-4 w-4 text-red-500" aria-hidden="true" />
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="glass"
          aria-label={uiTranslations.viewSourceFor(repoName)}
          onClick={onViewSource}
        >
          <Code2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}