'use client';

import { api } from '@convex/generated/api';
import type { Id } from '@convex/generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import React, { useCallback, useState } from 'react';
import { toast } from 'sonner';

interface RegenerateOptions {
  onComplete?: (jobId: string) => void;
  onError?: (error: string) => void;
}

interface Repository {
  _id: Id<'repositories'>;
  fullName: string;
  userId: Id<'users'>;
}

export function useRegenerate(repository?: Repository, options: RegenerateOptions = {}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<Id<'jobs'> | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const regenerate = useMutation(api.jobs.regenerate);

  // Track the active regeneration job for real-time updates
  const activeJob = useQuery(api.jobs.getById, currentJobId ? { id: currentJobId } : 'skip');

  const handleRegenerateClick = () => {
    if (!repository) {
      toast.error('Erreur', {
        description: 'Aucun dépôt sélectionné',
      });
      return;
    }
    setIsModalOpen(true);
  };

  const handleRegenerate = async () => {
    if (!repository) {
      return;
    }

    setIsStarting(true);
    try {
      const result = await regenerate({
        repositoryId: repository._id,
        userId: repository.userId,
        prompt: `Régénérer le cours pour ${repository.fullName}`,
      });

      setCurrentJobId(result.jobId);

      toast.success('Régénération démarrée', {
        description: 'Le processus de régénération a commencé.',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Impossible de démarrer la régénération';

      toast.error('Erreur', {
        description: errorMessage,
      });

      options.onError?.(errorMessage);
    } finally {
      setIsStarting(false);
    }
  };

  const handleComplete = useCallback(
    (jobId: string) => {
      toast.success('Régénération terminée!', {
        description: 'Votre cours a été mis à jour avec succès.',
      });

      setIsModalOpen(false);
      setCurrentJobId(null);
      options.onComplete?.(jobId);
    },
    [options],
  );

  // Auto-complete when active job finishes
  React.useEffect(() => {
    if (activeJob?.status === 'completed' && currentJobId) {
      handleComplete(activeJob._id);
    }
  }, [activeJob?.status, activeJob?._id, currentJobId, handleComplete]);

  const handleClose = () => {
    setIsModalOpen(false);
  };

  return {
    // State
    isModalOpen,
    currentJobId,
    isStarting,
    activeJob, // Provide the active regeneration job for real-time updates

    // Actions
    handleRegenerateClick,
    handleRegenerate,
    handleComplete,
    handleClose,

    // Manual controls
    openModal: () => setIsModalOpen(true),
    closeModal: () => setIsModalOpen(false),

    // Repository check
    canRegenerate: Boolean(repository),

    // Status helpers
    isRegenerating: Boolean(
      currentJobId &&
        activeJob &&
        ['pending', 'claimed', 'cloning', 'analyzing', 'gathering', 'running'].includes(
          activeJob.status,
        ),
    ),
  };
}
