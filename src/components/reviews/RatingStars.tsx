import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingStarsProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
}

export function RatingStars({ 
  rating, 
  onRatingChange, 
  readonly = false, 
  size = 'md',
  showValue = false 
}: RatingStarsProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4', 
    lg: 'w-5 h-5'
  };

  const starSize = sizeClasses[size];

  const handleStarClick = (starRating: number) => {
    if (!readonly && onRatingChange) {
      // Allow clicking the same star to clear rating
      if (starRating === rating) {
        onRatingChange(0);
      } else {
        onRatingChange(starRating);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, starRating: number) => {
    if (!readonly && onRatingChange && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      handleStarClick(starRating);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((starRating) => {
        const filled = starRating <= rating;
        
        return (
          <button
            key={starRating}
            type="button"
            onClick={() => handleStarClick(starRating)}
            onKeyDown={(e) => handleKeyDown(e, starRating)}
            disabled={readonly}
            className={cn(
              'rating-star',
              starSize,
              filled ? 'filled' : 'empty',
              !readonly && 'hover:scale-110 focus-visible:scale-110',
              readonly && 'cursor-default'
            )}
            aria-label={`${starRating} star${starRating === 1 ? '' : 's'}`}
            tabIndex={readonly ? -1 : 0}
          >
            <Star 
              className={cn(
                'w-full h-full',
                filled ? 'fill-current' : 'fill-none'
              )} 
            />
          </button>
        );
      })}
      
      {showValue && rating > 0 && (
        <span className="ml-2 text-sm text-muted-foreground">
          {rating}/5
        </span>
      )}
    </div>
  );
}