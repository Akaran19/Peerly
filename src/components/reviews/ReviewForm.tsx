import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ReviewFormProps {
  initialReview?: string;
  onSave: (review: string) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

const MAX_REVIEW_LENGTH = 280;

export function ReviewForm({ initialReview = '', onSave, onCancel, isLoading = false }: ReviewFormProps) {
  const [review, setReview] = useState(initialReview);
  const [isExpanded, setIsExpanded] = useState(Boolean(initialReview));
  
  const remainingChars = MAX_REVIEW_LENGTH - review.length;
  const isOverLimit = remainingChars < 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOverLimit && review.trim()) {
      onSave(review.trim());
    }
  };

  const handleCancel = () => {
    setReview(initialReview);
    setIsExpanded(Boolean(initialReview));
    onCancel?.();
  };

  if (!isExpanded) {
    return (
      <Button
        variant="outline"
        onClick={() => setIsExpanded(true)}
        className="w-full"
      >
        {initialReview ? 'Edit review' : 'Write a review'}
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <label htmlFor="review-textarea" className="sr-only">
          Write your review
        </label>
        <Textarea
          id="review-textarea"
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="Share your thoughts on this paper..."
          className="min-h-[100px] resize-none"
          autoFocus
          aria-describedby="char-counter"
        />
        <div className="flex justify-between items-center text-xs">
          <span 
            id="char-counter"
            className={cn(
              "transition-colors",
              isOverLimit ? "text-destructive" : "text-muted-foreground"
            )}
            aria-live="polite"
          >
            {remainingChars} characters remaining
          </span>
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={isLoading || !review.trim() || isOverLimit}
          size="sm"
        >
          {isLoading ? 'Saving...' : 'Save Review'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        {initialReview && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setReview('');
              onSave('');
            }}
            disabled={isLoading}
            className="text-destructive hover:text-destructive"
          >
            Remove
          </Button>
        )}
      </div>
    </form>
  );
}