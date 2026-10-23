import { PaperAggregates } from '@/types';
import { RatingStars } from '@/components/reviews/RatingStars';
import { Users, Star } from 'lucide-react';

interface AggregateStatsProps {
  aggregates: PaperAggregates;
}

export function AggregateStats({ aggregates }: AggregateStatsProps) {
  const { avgRating, count } = aggregates;
  
  if (count === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="w-4 h-4" />
        <span>No ratings yet</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <RatingStars rating={avgRating} readonly size="sm" />
        <span className="text-sm font-medium">
          {avgRating.toFixed(1)}
        </span>
      </div>
      
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Users className="w-4 h-4" />
        <span>{count} {count === 1 ? 'person' : 'people'}</span>
      </div>
    </div>
  );
}