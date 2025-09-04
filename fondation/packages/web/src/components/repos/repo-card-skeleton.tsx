import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function RepoCardSkeleton() {
  return (
    <Card className="glass h-full backdrop-blur-xl overflow-hidden">
      <div className="p-6 h-full flex flex-col">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div>
                <Skeleton className="h-5 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-6 w-6 rounded-lg" />
          </div>
        </div>

        {/* Description */}
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-4" />

        {/* Flexible spacer */}
        <div className="flex-grow" />

        {/* Languages */}
        <div className="flex flex-wrap gap-1 mb-4">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-4 w-12" />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>
    </Card>
  );
}

export function RepoGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {Array.from({ length: 6 }, (_, i) => (
        <RepoCardSkeleton key={`skeleton-item-${i + 1}`} />
      ))}
    </div>
  );
}
