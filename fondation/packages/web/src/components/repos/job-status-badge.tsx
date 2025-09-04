'use client';

import { CheckCircle, Loader2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { translateProgress } from '@/lib/translations';

export type JobStatus =
  | 'pending'
  | 'claimed'
  | 'cloning'
  | 'analyzing'
  | 'gathering'
  | 'running'
  | 'completed'
  | 'failed'
  | 'canceled'
  | 'dead';

interface JobStatusBadgeProps {
  status?: JobStatus;
  progress?: string;
}

/**
 * Component to display job status as a badge
 * Shows appropriate icon and translated text based on status
 */
export function JobStatusBadge({ status, progress }: JobStatusBadgeProps) {
  if (!status) {
    return null;
  }

  const isProcessing = [
    'pending',
    'claimed',
    'cloning',
    'analyzing',
    'gathering',
    'running',
  ].includes(status);

  if (isProcessing) {
    return (
      <Badge variant="default" className="animate-pulse">
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        {translateProgress(progress)}
      </Badge>
    );
  }

  if (status === 'completed') {
    return (
      <Badge variant="secondary" className="bg-green-500/10 text-green-500">
        <CheckCircle className="mr-1 h-3 w-3" />
        Cours Prêt
      </Badge>
    );
  }

  if (status === 'failed') {
    return <Badge variant="destructive">Génération Échouée</Badge>;
  }

  if (status === 'canceled') {
    return (
      <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">
        <X className="mr-1 h-3 w-3" />
        Annulé
      </Badge>
    );
  }

  if (status === 'dead') {
    return (
      <Badge variant="destructive">
        <X className="mr-1 h-3 w-3" />
        Mort
      </Badge>
    );
  }

  return null;
}
