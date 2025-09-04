'use client';

import { api } from '@convex/generated/api';
import { useMutation, useQuery } from 'convex/react';
// import { motion } from 'framer-motion'; // Removed to fix blinking during scroll
import {
  Activity,
  BarChart3,
  Clock,
  FileText,
  GitBranch,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import React from 'react';
import { RepositoryList } from '@/components/repos/repository-list';
import { Card } from '@/components/ui/card';

interface DashboardContentProps {
  githubId: string;
  userName?: string | null;
}

export function DashboardContent({ githubId, userName }: DashboardContentProps) {
  const user = useQuery(api.users.getUserByGithubId, { githubId });
  const createUser = useMutation(api.users.createOrUpdateUser);
  const dashboardStats = useQuery(
    api.users.getDashboardStats,
    user ? { userId: user._id } : 'skip',
  );

  // Create user if it doesn't exist
  React.useEffect(() => {
    if (!user && githubId && userName) {
      void createUser({
        githubId,
        username: userName ?? 'user',
        email: '', // We don't have email in session
        avatarUrl: `https://github.com/${userName}.png`,
      });
    }
  }, [user, githubId, userName, createUser]);

  if (!user || !dashboardStats) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="mb-2 text-4xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
            Bon retour, {userName}!
          </h2>
          <p className="text-muted-foreground">
            {!user ? 'Configuration de votre tableau de bord...' : 'Chargement des statistiques...'}
          </p>
        </div>
        <Card className="glass p-8 backdrop-blur-xl">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
            <div>
              <h3 className="text-lg font-semibold">
                {!user ? 'Initialisation de votre espace de travail' : 'Chargement des données'}
              </h3>
              <p className="text-muted-foreground">Cela ne prendra qu&apos;un instant...</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const stats = [
    {
      title: 'Total des Dépôts',
      value: dashboardStats.totalRepositories.toString(),
      change:
        dashboardStats.recentRepositories > 0
          ? `+${dashboardStats.recentRepositories} cette semaine`
          : 'Aucun nouveau dépôt',
      icon: <GitBranch className="h-5 w-5" />,
      gradient: 'from-purple-500 to-pink-500',
      hasIncrease: dashboardStats.recentRepositories > 0,
    },
    {
      title: 'Docs Générés',
      value: dashboardStats.totalDocsGenerated.toString(),
      change:
        dashboardStats.recentDocs > 0
          ? `+${dashboardStats.recentDocs} ce mois`
          : 'Aucun nouveau doc',
      icon: <FileText className="h-5 w-5" />,
      gradient: 'from-blue-500 to-cyan-500',
      hasIncrease: dashboardStats.recentDocs > 0,
    },
    {
      title: 'Tâches Actives',
      value: dashboardStats.activeJobs.toString(),
      change: dashboardStats.activeJobs > 0 ? 'En cours' : 'Aucune tâche',
      icon: <Activity className="h-5 w-5" />,
      gradient: 'from-green-500 to-emerald-500',
      hasIncrease: false,
      isActive: dashboardStats.activeJobs > 0,
    },
    {
      title: 'Taux de Réussite',
      value: `${dashboardStats.successRate}%`,
      change:
        dashboardStats.successRate >= 95
          ? 'Excellent'
          : dashboardStats.successRate >= 80
            ? 'Bon'
            : 'À améliorer',
      icon: <TrendingUp className="h-5 w-5" />,
      gradient: 'from-orange-500 to-red-500',
      hasIncrease: dashboardStats.successRate >= 95,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h2 className="mb-2 text-4xl font-bold">
          Bon retour,
          <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
            {' '}
            {userName}!
          </span>
        </h2>
        <p className="text-muted-foreground">
          Voici un aperçu de votre activité de génération de documentation
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={stat.title}>
            <Card className="glass glass-hover p-6 backdrop-blur-xl transition-transform duration-200 hover:scale-[1.02]">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground flex items-center">
                    {stat.hasIncrease ? (
                      <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                    ) : stat.isActive ? (
                      <Clock className="h-3 w-3 mr-1 animate-pulse text-yellow-500" />
                    ) : stat.change === 'En cours' ? (
                      <Clock className="h-3 w-3 mr-1 animate-pulse text-yellow-500" />
                    ) : null}
                    {stat.change}
                  </p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.gradient} opacity-20`}>
                  <div className={`bg-gradient-to-r ${stat.gradient} bg-clip-text`}>
                    {stat.icon}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <Card className="glass p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-purple-500" />
              Actions Rapides
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-all duration-300 hover:scale-[1.02] text-left cursor-pointer">
              <BarChart3 className="h-6 w-6 mb-2 text-blue-500" />
              <h4 className="font-semibold mb-1">Analytique</h4>
              <p className="text-sm text-muted-foreground">Voir les métriques détaillées</p>
            </button>
            <button className="p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-all duration-300 hover:scale-[1.02] text-left cursor-pointer">
              <Users className="h-6 w-6 mb-2 text-green-500" />
              <h4 className="font-semibold mb-1">Équipe</h4>
              <p className="text-sm text-muted-foreground">Gérer les collaborateurs</p>
            </button>
            <button className="p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-all duration-300 hover:scale-[1.02] text-left cursor-pointer">
              <FileText className="h-6 w-6 mb-2 text-purple-500" />
              <h4 className="font-semibold mb-1">Modèles</h4>
              <p className="text-sm text-muted-foreground">Parcourir les modèles de docs</p>
            </button>
          </div>
        </Card>
      </div>

      {/* Repository List */}
      <div>
        <RepositoryList userId={user._id} />
      </div>
    </div>
  );
}
