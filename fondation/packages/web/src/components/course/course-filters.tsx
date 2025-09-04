'use client';

import { Filter, ArrowUpDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  courseStatusOptions,
  courseSortOptions,
  type CourseStatus,
  type CourseSortBy,
} from '@/lib/course-search';

interface CourseFiltersProps {
  statusFilter: CourseStatus;
  onStatusFilterChange: (status: CourseStatus) => void;
  sortBy: CourseSortBy;
  onSortByChange: (sortBy: CourseSortBy) => void;
  className?: string;
}

export function CourseFilters({
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  className = '',
}: CourseFiltersProps) {
  return (
    <div className={`flex flex-col sm:flex-row gap-3 ${className}`}>
      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background/50 backdrop-blur-sm border-border/50">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            {courseStatusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sort By */}
      <div className="flex items-center gap-2">
        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
        <Select value={sortBy} onValueChange={onSortByChange}>
          <SelectTrigger className="w-full sm:w-[200px] bg-background/50 backdrop-blur-sm border-border/50">
            <SelectValue placeholder="Trier par" />
          </SelectTrigger>
          <SelectContent>
            {courseSortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}