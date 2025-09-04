'use client';

import { Bell, Database, Github, Loader2, Palette, Shield, User, Zap } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function SettingsPage() {
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
          Paramètres
        </h1>
        <p className="text-muted-foreground">
          Personnalisez votre expérience Fondation et gérez vos préférences
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20">
              <User className="h-5 w-5 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold">Profil Utilisateur</h3>
          </div>
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Nom d'utilisateur</span>
              <span className="text-sm font-medium">{session.user?.name || 'Non défini'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium">{session.user?.email || 'Non défini'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Compte GitHub</span>
              <span className="text-sm font-medium">Connecté</span>
            </div>
          </div>
          <Button variant="outline" size="sm" disabled>
            Modifier le Profil
          </Button>
        </Card>

        <Card className="glass p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20">
              <Palette className="h-5 w-5 text-purple-500" />
            </div>
            <h3 className="text-lg font-semibold">Apparence</h3>
          </div>
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Thème</span>
              <span className="text-sm font-medium">Système</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Langue</span>
              <span className="text-sm font-medium">Français</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Animations</span>
              <span className="text-sm font-medium">Activées</span>
            </div>
          </div>
          <Button variant="outline" size="sm" disabled>
            Personnaliser
          </Button>
        </Card>

        <Card className="glass p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-r from-yellow-500/20 to-orange-500/20">
              <Bell className="h-5 w-5 text-yellow-500" />
            </div>
            <h3 className="text-lg font-semibold">Notifications</h3>
          </div>
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Génération terminée</span>
              <span className="text-sm font-medium">Email + App</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Erreurs de traitement</span>
              <span className="text-sm font-medium">Email</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Mises à jour produit</span>
              <span className="text-sm font-medium">Désactivées</span>
            </div>
          </div>
          <Button variant="outline" size="sm" disabled>
            Configurer
          </Button>
        </Card>

        <Card className="glass p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20">
              <Zap className="h-5 w-5 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold">Génération</h3>
          </div>
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Modèle IA</span>
              <span className="text-sm font-medium">Claude Sonnet</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Niveau de détail</span>
              <span className="text-sm font-medium">Standard</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Inclure les exemples</span>
              <span className="text-sm font-medium">Oui</span>
            </div>
          </div>
          <Button variant="outline" size="sm" disabled>
            Ajuster
          </Button>
        </Card>

        <Card className="glass p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-r from-red-500/20 to-pink-500/20">
              <Shield className="h-5 w-5 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold">Sécurité</h3>
          </div>
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Authentification 2FA</span>
              <span className="text-sm font-medium">Via GitHub</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Sessions actives</span>
              <span className="text-sm font-medium">1 appareil</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Dernière connexion</span>
              <span className="text-sm font-medium">Aujourd'hui</span>
            </div>
          </div>
          <Button variant="outline" size="sm" disabled>
            Gérer
          </Button>
        </Card>

        <Card className="glass p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-r from-indigo-500/20 to-blue-500/20">
              <Database className="h-5 w-5 text-indigo-500" />
            </div>
            <h3 className="text-lg font-semibold">Données</h3>
          </div>
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Exporter mes données</span>
              <Button variant="ghost" size="sm" disabled>
                <span className="text-xs">RGPD</span>
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Supprimer le compte</span>
              <Button variant="ghost" size="sm" disabled>
                <span className="text-xs text-red-500">Danger</span>
              </Button>
            </div>
          </div>
          <Button variant="outline" size="sm" disabled>
            Options Avancées
          </Button>
        </Card>
      </div>

      <Card className="glass p-8 text-center">
        <Github className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Page de Paramètres en Construction</h2>
        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
          Les fonctionnalités de configuration avancées sont actuellement en développement. Vous
          pouvez déjà modifier certains paramètres via votre profil GitHub.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/dashboard">
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white">
              Retour au Tableau de Bord
            </Button>
          </Link>
          <Button variant="outline" disabled>
            Paramètres GitHub
          </Button>
        </div>
      </Card>
    </div>
  );
}
