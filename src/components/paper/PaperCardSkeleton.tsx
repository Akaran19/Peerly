import { Skeleton } from '@/components/ui/skeleton';

interface PaperCardSkeletonProps {
  showAbstract?: boolean;
  // Matches PaperCard's numbered row layout
  row?: boolean;
}

export function PaperCardSkeleton({ showAbstract = false, row = false }: PaperCardSkeletonProps) {
  return (
    <div
      className={
        row
          ? 'grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 py-6 sm:grid-cols-[3rem_minmax(0,1fr)_7rem] sm:gap-x-5'
          : 'academic-card space-y-3 p-5'
      }
    >
      {row && <Skeleton className="mt-1 h-3 w-5" />}
      <div className="space-y-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-6 w-4/5" />
        <Skeleton className="h-4 w-2/5" />
        {showAbstract && (
          <div className="space-y-2 pt-1">
            <Skeleton className="h-4 w-full max-w-[60ch]" />
            <Skeleton className="h-4 w-3/4 max-w-[45ch]" />
          </div>
        )}
      </div>
      {row && <Skeleton className="ml-auto hidden h-7 w-14 sm:block" />}
    </div>
  );
}
