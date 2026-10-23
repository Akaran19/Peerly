import { Skeleton } from '@/components/ui/skeleton';

interface PaperCardSkeletonProps {
  showAbstract?: boolean;
}

export function PaperCardSkeleton({ showAbstract = false }: PaperCardSkeletonProps) {
  return (
    <div className="academic-card p-6 space-y-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
          <Skeleton className="w-8 h-8 rounded-full" />
        </div>

        <div className="flex items-center gap-3">
          <Skeleton className="w-4 h-4 rounded-full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="w-4 h-4 rounded-full" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="w-4 h-4 rounded-full" />
          <Skeleton className="h-4 w-12" />
        </div>

        <Skeleton className="h-5 w-24" />

        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="w-4 h-4 rounded" />
            ))}
          </div>
          <Skeleton className="h-4 w-16" />
        </div>

        {showAbstract && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        )}
      </div>

      <div className="pt-2 border-t">
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}
