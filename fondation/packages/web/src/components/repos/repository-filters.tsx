'use client';

import { CheckCircle, AlertCircle, Clock, XCircle, Filter, SortAsc } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type RepositoryFilterStatus = 'all' | 'ready' | 'attention' | 'in_progress' | 'failed';
type RepositorySortBy = 'name' | 'updated' | 'docs_count' | 'languages';

interface RepositoryFiltersProps {
  statusFilter: RepositoryFilterStatus;
  onStatusFilterChange: (status: RepositoryFilterStatus) => void;
  sortBy: RepositorySortBy;
  onSortByChange: (sortBy: RepositorySortBy) => void;
}

const statusOptions = [
  {
    value: 'all' as const,
    label: 'Tous les dépôts',
    shortLabel: 'Tous',
    icon: Filter,
    color: 'bg-muted/50 text-muted-foreground',
    description: 'Afficher tous les dépôts',
  },
  {
    value: 'ready' as const,
    label: 'Prêts à consulter',
    shortLabel: 'Prêts',
    icon: CheckCircle,
    color: 'bg-green-500/10 text-green-500 border-green-500/20',
    description: 'Cours générés avec succès',
  },
  {
    value: 'attention' as const,
    label: 'Nécessitent attention',
    shortLabel: 'Attention',
    icon: AlertCircle,
    color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    description: 'Aucun cours ou échec de génération',
  },
  {
    value: 'in_progress' as const,
    label: 'En cours de traitement',
    shortLabel: 'En cours',
    icon: Clock,
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    description: 'Génération en cours',
  },
  {
    value: 'failed' as const,
    label: 'Échoués',
    shortLabel: 'Échoués',
    icon: XCircle,
    color: 'bg-red-500/10 text-red-500 border-red-500/20',
    description: 'Génération échouée',
  },
];

const sortOptions = [
  { value: 'updated' as const, label: 'Dernière mise à jour' },
  { value: 'name' as const, label: 'Nom du dépôt' },
  { value: 'docs_count' as const, label: 'Nombre de documents' },
  { value: 'languages' as const, label: 'Nombre de langages' },
];

export function RepositoryFilters({
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
}: RepositoryFiltersProps) {
  const currentStatusOption = statusOptions.find((option) => option.value === statusFilter);
  const currentSortOption = sortOptions.find((option) => option.value === sortBy);

  return (
    <div className="space-y-4">
      {/* Mobile-optimized layout */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Status Filter Pills - Responsive Grid */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:max-w-xl">
          {statusOptions.map((option) => {
            const Icon = option.icon;
            const isActive = statusFilter === option.value;

            return (
              <button
                type="button"
                key={option.value}
                onClick={() => onStatusFilterChange(option.value)}
                className={`
                  group flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 
                  px-2.5 py-2 sm:px-3 rounded-lg sm:rounded-full 
                  text-xs sm:text-sm font-medium
                  border transition-all duration-200 hover:scale-[1.02]
                  ${
                    isActive
                      ? `${option.color} border-current`
                      : 'bg-background/50 text-muted-foreground border-border/50 hover:bg-muted/50'
                  }
                `}
                title={option.description}
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">{option.label}</span>
                <span className="sm:hidden">{option.shortLabel}</span>
                {isActive && (
                  <Badge
                    variant="secondary"
                    className="ml-auto h-4 w-4 sm:h-5 sm:w-5 rounded-full p-0 flex items-center justify-center text-[10px] sm:text-xs"
                  >
                    ✓
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Sort Select - Responsive width */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <SortAsc className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Select value={sortBy} onValueChange={onSortByChange}>
            <SelectTrigger className="w-full sm:w-[180px] md:w-[200px] bg-background/50 backdrop-blur-sm">
              <SelectValue placeholder="Trier par..." />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filters Summary - Better mobile layout */}
      {(statusFilter !== 'all' || sortBy !== 'updated') && (
        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground px-2 sm:px-0">
          <span className="font-medium">Filtres actifs:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {statusFilter !== 'all' && (
              <Badge variant="secondary" className="text-[10px] sm:text-xs">
                {currentStatusOption?.shortLabel || currentStatusOption?.label}
              </Badge>
            )}
            {sortBy !== 'updated' && (
              <Badge variant="secondary" className="text-[10px] sm:text-xs">
                Tri: {currentSortOption?.label}
              </Badge>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              onStatusFilterChange('all');
              onSortByChange('updated');
            }}
            className="ml-auto sm:ml-2 text-xs text-purple-500 hover:text-purple-600 underline font-medium"
          >
            Réinitialiser
          </button>
        </div>
      )}
    </div>
  );
}
