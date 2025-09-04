'use client';

import { Archive, Filter, FolderGit2, Loader2, Search, Settings, Star } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function RepositoriesPage() {
  const { data: session } = useSession();

  if (!session?.user?.id) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">
          Gestion des Dépôts
        </h1>
        <p className="text-muted-foreground">
          Organisez et gérez vos dépôts GitHub pour une génération de documentation optimisée
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="glass p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20">
              <Search className="h-5 w-5 text-blue-500" />
            </div>
            <h3 className="font-semibold">Recherche Avancée</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Recherchez dans vos dépôts par nom, description, ou technologie.
          </p>
          <Button variant="outline" size="sm" disabled>
            Bientôt Disponible
          </Button>
        </Card>

        <Card className="glass p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20">
              <Filter className="h-5 w-5 text-green-500" />
            </div>
            <h3 className="font-semibold">Filtres et Tri</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Organisez vos dépôts par date, taille, ou statut de documentation.
          </p>
          <Button variant="outline" size="sm" disabled>
            Bientôt Disponible
          </Button>
        </Card>

        <Card className="glass p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-r from-yellow-500/20 to-orange-500/20">
              <Star className="h-5 w-5 text-yellow-500" />
            </div>
            <h3 className="font-semibold">Favoris</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Marquez vos dépôts les plus importants comme favoris.
          </p>
          <Button variant="outline" size="sm" disabled>
            Bientôt Disponible
          </Button>
        </Card>

        <Card className="glass p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20">
              <Settings className="h-5 w-5 text-purple-500" />
            </div>
            <h3 className="font-semibold">Configuration</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Personnalisez les paramètres de génération par dépôt.
          </p>
          <Button variant="outline" size="sm" disabled>
            Bientôt Disponible
          </Button>
        </Card>

        <Card className="glass p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-r from-red-500/20 to-pink-500/20">
              <Archive className="h-5 w-5 text-red-500" />
            </div>
            <h3 className="font-semibold">Archivage</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Masquez les dépôts inactifs de votre vue principale.
          </p>
          <Button variant="outline" size="sm" disabled>
            Bientôt Disponible
          </Button>
        </Card>

        <Card className="glass p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-r from-indigo-500/20 to-blue-500/20">
              <FolderGit2 className="h-5 w-5 text-indigo-500" />
            </div>
            <h3 className="font-semibold">Opérations en Lot</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Générez la documentation pour plusieurs dépôts simultanément.
          </p>
          <Button variant="outline" size="sm" disabled>
            Bientôt Disponible
          </Button>
        </Card>
      </div>

      <Card className="glass p-8 text-center">
        <FolderGit2 className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Fonctionnalités Avancées en Développement</h2>
        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
          Cette page proposera bientôt des outils avancés de gestion de dépôts. En attendant, vous
          pouvez accéder à tous vos dépôts depuis le tableau de bord principal.
        </p>
        <Link href="/dashboard">
          <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white">
            Retour au Tableau de Bord
          </Button>
        </Link>
      </Card>
    </div>
  );
}
