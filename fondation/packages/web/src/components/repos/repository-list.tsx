'use client';

import { api } from '@convex/generated/api';
import type { Id } from '@convex/generated/dataModel';
import { useAction, useQuery } from 'convex/react';
import { RefreshCw, FolderOpen } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CourseSearchBar } from '@/components/course/course-search-bar';
import { getUserFriendlyError } from '@/lib/error-messages';
import { logger } from '@/lib/logger';
import { withRetry } from '@/lib/retry';
import { RepoCard } from './repo-card';
import { RepositoryFilters } from './repository-filters';

interface RepositoryListProps {
  userId: Id<'users'>;
}

type RepositoryFilterStatus = 'all' | 'ready' | 'attention' | 'in_progress' | 'failed';
type RepositorySortBy = 'name' | 'updated' | 'docs_count' | 'languages';

interface RepositoryWithJob {
  _id: Id<'repositories'>;
  name: string;
  fullName: string;
  description?: string;
  defaultBranch: string;
  languages?: {
    primary?: string;
    all?: Array<{ name: string; percentage: number; bytes: number }>;
  };
  latestJob?: {
    _id: Id<'jobs'>;
    status: string;
    docsCount?: number;
    createdAt: number;
  };
}

export function RepositoryList({ userId }: RepositoryListProps) {
  const { data: session } = useSession();
  const [isFetching, setIsFetching] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<RepositoryFilterStatus>('all');
  const [sortBy, setSortBy] = React.useState<RepositorySortBy>('updated');

  const repositories = useQuery(api.repositories.listUserRepositories, {
    userId,
  });
  const jobs = useQuery(api.jobs.listUserJobs, { userId });
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

  // Enhanced search and filtering logic
  const filteredAndSortedRepositories = React.useMemo(() => {
    if (!repositories || !jobs) { return []; }

    // Create a map of latest jobs per repository
    const jobMap = new Map<Id<'repositories'>, { _id: Id<'jobs'>; status: string; docsCount?: number; createdAt: number; repositoryId: Id<'repositories'> }>();
    jobs.forEach((job) => {
      const existing = jobMap.get(job.repositoryId);
      if (!existing || job.createdAt > existing.createdAt) {
        jobMap.set(job.repositoryId, job);
      }
    });

    // Combine repositories with their latest job
    const repositoriesWithJobs: RepositoryWithJob[] = repositories.map((repo) => ({
      ...repo,
      latestJob: jobMap.get(repo._id),
    }));

    // Apply search filter with weighted scoring
    let filtered = repositoriesWithJobs;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = repositoriesWithJobs
        .map((repo) => {
          let score = 0;

          // Weighted search scoring
          if (repo.name.toLowerCase().includes(query)) { score += 10; }
          if (repo.fullName.toLowerCase().includes(query)) { score += 8; }
          if (repo.description?.toLowerCase().includes(query)) { score += 6; }

          // Search in languages
          const languages = repo.languages?.all?.map((l) => l.name.toLowerCase()) ?? [];
          if (languages.some((lang) => lang.includes(query))) { score += 4; }

          // Search in job status for contextual results
          if (repo.latestJob?.status.toLowerCase().includes(query)) { score += 3; }

          return { ...repo, searchScore: score };
        })
        .filter((repo) => repo.searchScore > 0)
        .sort((a, b) => b.searchScore - a.searchScore);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((repo) => {
        const job = repo.latestJob;
        switch (statusFilter) {
          case 'ready':
            return job?.status === 'completed' && job.docsCount && job.docsCount > 0;
          case 'attention':
            return !job || job.status === 'failed' || job.status === 'dead';
          case 'in_progress':
            return (
              job &&
              ['pending', 'claimed', 'cloning', 'analyzing', 'gathering', 'running'].includes(
                job.status,
              )
            );
          case 'failed':
            return job && (job.status === 'failed' || job.status === 'dead');
          default:
            return true;
        }
      });
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'updated':
          return (b.latestJob?.createdAt ?? 0) - (a.latestJob?.createdAt ?? 0);
        case 'docs_count':
          return (b.latestJob?.docsCount ?? 0) - (a.latestJob?.docsCount ?? 0);
        case 'languages': {
          const aLangCount = a.languages?.all?.length ?? 0;
          const bLangCount = b.languages?.all?.length ?? 0;
          return bLangCount - aLangCount;
        }
        default:
          return 0;
      }
    });
  }, [repositories, jobs, searchQuery, statusFilter, sortBy]);

  // Show loading state only when repositories is explicitly undefined (not empty array)
  if (repositories === undefined || jobs === undefined) {
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
        <div>
          <h3 className="text-2xl font-semibold">Vos Dépôts</h3>
          <p className="text-muted-foreground">
            {filteredAndSortedRepositories.length} dépôt
            {filteredAndSortedRepositories.length > 1 ? 's' : ''}
            {searchQuery || statusFilter !== 'all'
              ? ` trouvé${filteredAndSortedRepositories.length > 1 ? 's' : ''}`
              : ''}
          </p>
        </div>
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
        <>
          {/* Enhanced Search and Filters */}
          <div className="space-y-4">
            <CourseSearchBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              placeholder="Rechercher par nom, description, ou langage..."
              className="max-w-lg"
            />
            <RepositoryFilters
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              sortBy={sortBy}
              onSortByChange={setSortBy}
            />
          </div>

          {/* Results */}
          {filteredAndSortedRepositories.length === 0 && (searchQuery || statusFilter !== 'all') ? (
            <div className="flex items-center justify-center min-h-[30vh]">
              <Card className="glass p-8 text-center max-w-md">
                <FolderOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h2 className="text-lg font-semibold mb-2">Aucun dépôt trouvé</h2>
                <p className="text-muted-foreground mb-4">
                  Aucun dépôt ne correspond à vos critères de recherche.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                >
                  Réinitialiser les filtres
                </Button>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAndSortedRepositories.map((repo) => (
                <RepoCard key={repo._id} repo={repo} userId={userId} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
