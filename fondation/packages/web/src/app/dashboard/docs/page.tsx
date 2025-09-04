'use client';

import { api } from '@convex/generated/api';
import type { Id } from '@convex/generated/dataModel';
import { useQuery } from 'convex/react';
// import { motion } from 'framer-motion'; // Removed to fix blinking during scroll
import React from 'react';
import {
  AlertCircle,
  Book,
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  FileText,
  FolderOpen,
  Loader2,
  Sparkles,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Get status icon and color for job status
const getStatusDisplay = (status?: string) => {
  switch (status) {
    case 'completed':
      return {
        icon: CheckCircle,
        color: 'bg-green-500/10 text-green-500 border-green-500/20',
        label: 'Terminé',
      };
    case 'running':
    case 'claimed':
    case 'cloning':
    case 'analyzing':
    case 'gathering':
      return {
        icon: Clock,
        color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        label: 'En cours',
      };
    case 'failed':
    case 'dead':
      return {
        icon: XCircle,
        color: 'bg-red-500/10 text-red-500 border-red-500/20',
        label: 'Échoué',
      };
    case 'canceled':
      return {
        icon: XCircle,
        color: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
        label: 'Annulé',
      };
    case 'pending':
      return {
        icon: Clock,
        color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        label: 'En attente',
      };
    default:
      return {
        icon: AlertCircle,
        color: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
        label: 'Inconnu',
      };
  }
};

export default function DocsPage() {
  const { data: session } = useSession();

  // Get the Convex user by githubId first
  const convexUser = useQuery(
    api.users.getUserByGithubId,
    session?.user?.githubId ? { githubId: session.user.githubId } : 'skip',
  );

  // Get all jobs for the user
  const jobs = useQuery(
    api.jobs.listUserJobs,
    convexUser?._id ? { userId: convexUser._id } : 'skip',
  );

  // Get repository details for each job - moved to top level to fix hook rules
  const repositories = useQuery(
    api.repositories.listUserRepositories,
    convexUser?._id ? { userId: convexUser._id } : 'skip',
  );

  const allJobs = jobs ?? [];

  // Show ONLY completed jobs, get the latest completed job per repository
  const completedJobsPerRepo = React.useMemo(() => {
    if (!allJobs.length) return [];
    
    // First filter to only completed jobs
    const completedJobs = allJobs.filter(job => job.status === 'completed');
    const jobsByRepo = new Map();
    
    // Group completed jobs by repositoryId and keep only the latest one
    for (const job of completedJobs) {
      const existingJob = jobsByRepo.get(job.repositoryId);
      if (!existingJob || job.createdAt > existingJob.createdAt) {
        jobsByRepo.set(job.repositoryId, job);
      }
    }
    
    return Array.from(jobsByRepo.values());
  }, [allJobs]);

  if (!session?.user?.githubId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (completedJobsPerRepo.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">
            Mes Cours
          </h1>
          <p className="text-muted-foreground">
            Tous vos cours générés à partir de vos dépôts GitHub
          </p>
        </div>

        <div className="flex items-center justify-center min-h-[50vh]">
          <Card className="glass p-12 text-center max-w-md">
            <FolderOpen className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Aucun cours disponible</h2>
            <p className="text-muted-foreground mb-6">
              Commencez par générer un cours depuis vos dépôts GitHub.
            </p>
            <Link href="/dashboard/repositories">
              <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white">
                <Sparkles className="mr-2 h-4 w-4" />
                Voir les dépôts
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const repoMap = new Map(repositories?.map((r) => [r._id, r]) ?? []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">
          Mes Cours
        </h1>
        <p className="text-muted-foreground">
          {completedJobsPerRepo.length} cours générés à partir de vos dépôts
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {completedJobsPerRepo.map((job, index) => {
          const repo = repoMap.get(job.repositoryId);
          if (!repo) {
            return null;
          }

          return (
            <div key={job._id}>
              <Card className="glass glass-hover h-full overflow-hidden group">
                <div className="p-6 flex flex-col h-full">
                  {/* Header */}
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20">
                          <Book className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{repo.name}</h3>
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

                    <div className="flex gap-2">
                      {(() => {
                        const statusDisplay = getStatusDisplay(job.status);
                        const StatusIcon = statusDisplay.icon;
                        return (
                          <Badge variant="secondary" className={`border ${statusDisplay.color}`}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {statusDisplay.label}
                          </Badge>
                        );
                      })()}
                      <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                        <FileText className="mr-1 h-3 w-3" />
                        {job.docsCount ?? 0} documents
                      </Badge>
                    </div>
                  </div>

                  {/* Description */}
                  {repo.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {repo.description}
                    </p>
                  )}

                  {/* Progress for running jobs */}
                  {job.status === 'running' && job.currentStep && (
                    <div className="mb-4">
                      <div className="text-sm text-muted-foreground mb-2">
                        Étape {job.currentStep} sur {job.totalSteps ?? 6}:{' '}
                        {job.progress ?? 'En cours'}
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${(job.currentStep / (job.totalSteps ?? 6)) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Error message for failed jobs */}
                  {(job.status === 'failed' || job.status === 'dead') && job.error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-500">Échec de génération</p>
                          <p className="text-xs text-red-500/80 mt-1">{job.error}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Spacer */}
                  <div className="flex-grow" />

                  {/* Footer */}
                  <div className="space-y-3">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="mr-1 h-3 w-3" />
                      Généré le {new Date(job.createdAt).toLocaleDateString('fr-FR')}
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href={`/course/${repo.fullName.split('/')[0]}/${repo.fullName.split('/')[1]}/latest`}
                        className="flex-1"
                      >
                        <Button
                          size="sm"
                          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                        >
                          <Book className="mr-2 h-4 w-4" />
                          Voir le cours
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
