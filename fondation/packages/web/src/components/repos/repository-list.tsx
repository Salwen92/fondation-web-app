'use client';

import { api } from '@convex/generated/api';
import type { Id } from '@convex/generated/dataModel';
import { useAction, useQuery } from 'convex/react';
import { RefreshCw } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getUserFriendlyError } from '@/lib/error-messages';
import { logger } from '@/lib/logger';
import { withRetry } from '@/lib/retry';
import { RepoCard } from './repo-card';

interface RepositoryListProps {
  userId: Id<'users'>;
}

export function RepositoryList({ userId }: RepositoryListProps) {
  const { data: session } = useSession();
  const [isFetching, setIsFetching] = useState(false);

  const repositories = useQuery(api.repositories.listUserRepositories, {
    userId,
  });
  const fetchRepositories = useAction(api.repositories.fetchGitHubRepositories);

  const handleFetchRepositories = useCallback(async () => {
    if (!session?.accessToken) {
      toast.error("Aucun jeton d'accès disponible");
      return;
    }

    setIsFetching(true);
    try {
      await withRetry(
        async () => {
          if (!session.accessToken) {
            throw new Error('No access token available');
          }
          await fetchRepositories({
            accessToken: session.accessToken,
            userId,
          });
        },
        {
          maxAttempts: 3,
          onRetry: (_error, attempt) => {
            toast.info(`Nouvelle tentative (${attempt}/3)...`);
          },
        },
      );
      toast.success('Dépôts récupérés avec succès');
    } catch (error) {
      logger.error(
        'Error fetching repositories',
        error instanceof Error ? error : new Error(String(error)),
      );
      const friendlyMessage = getUserFriendlyError(error);
      toast.error(friendlyMessage);
    } finally {
      setIsFetching(false);
    }
  }, [session?.accessToken, userId, fetchRepositories]);

  useEffect(() => {
    if (repositories?.length === 0 && session?.accessToken) {
      handleFetchRepositories().catch(() => {
        // Repository fetch error handled in the function
      });
    }
  }, [repositories, session?.accessToken, handleFetchRepositories]);

  if (!repositories) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-muted-foreground">Chargement des dépôts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-semibold">Vos Dépôts</h3>
        <Button onClick={handleFetchRepositories} disabled={isFetching} variant="outline" size="sm">
          <RefreshCw className={isFetching ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
          Actualiser
        </Button>
      </div>

      {repositories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">Aucun dépôt trouvé</p>
          <Button onClick={handleFetchRepositories} disabled={isFetching}>
            <RefreshCw className={isFetching ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
            Récupérer les dépôts depuis GitHub
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {repositories.map((repo) => (
            <RepoCard key={repo._id} repo={repo} userId={userId} />
          ))}
        </div>
      )}
    </div>
  );
}
