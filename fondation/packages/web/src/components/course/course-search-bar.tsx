'use client';

import { Search, X } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CourseSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export function CourseSearchBar({
  searchQuery,
  onSearchChange,
  placeholder = 'Rechercher par nom de dépôt ou description...',
  className = '',
}: CourseSearchBarProps) {
  const handleClear = React.useCallback(() => {
    onSearchChange('');
  }, [onSearchChange]);

  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value);
    },
    [onSearchChange],
  );

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={handleInputChange}
          className="pl-10 pr-10 h-11 bg-background/50 backdrop-blur-sm border-border/50 focus:bg-background focus:border-border transition-all"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted/50"
            aria-label="Effacer la recherche"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
