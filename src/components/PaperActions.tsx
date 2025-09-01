import { useState, useEffect } from 'react';
import { UserPaper, Shelf } from '@/types';
import { ShelfSelector } from './ShelfSelector';
import { RatingStars } from './RatingStars';
import { ReviewForm } from './ReviewForm';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getUserPaper, upsertUserPaper } from '@/lib/supabaseHelpers';

interface PaperActionsProps {
  paperId: string;
  onUpdate?: (userPaper: UserPaper) => void;
}

export function PaperActions({ paperId, onUpdate }: PaperActionsProps) {
  const { user, signInWithGoogle } = useAuth();
  const [userPaper, setUserPaper] = useState<UserPaper | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserPaper();
    } else {
      setIsInitialLoading(false);
    }
  }, [paperId, user]);

  const loadUserPaper = async () => {
    if (!user) return;
    try {
      const data = await getUserPaper(paperId);
      setUserPaper(data);
    } catch (error) {
      console.error('Error loading user paper:', error);
    } finally {
      setIsInitialLoading(false);
    }
  };

  const updateUserPaper = async (updates: Partial<UserPaper>) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save changes.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const updated = await upsertUserPaper({
        paper_id: paperId,
        shelf: userPaper?.shelf || 'WANT',
        ...updates
      });
      
      setUserPaper(updated);
      onUpdate?.(updated);
      
      toast({
        title: "Updated successfully",
        description: "Your changes have been saved."
      });
    } catch (error) {
      console.error('Error updating user paper:', error);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleShelfChange = (shelf: Shelf) => {
    updateUserPaper({ shelf });
  };

  const handleRatingChange = (rating: number) => {
    updateUserPaper({ rating: rating || null });
  };

  const handleReviewSave = (review: string) => {
    updateUserPaper({ review: review || null });
  };

  if (isInitialLoading) {
    return (
      <Card className="p-6 w-full max-w-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded"></div>
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="p-6 w-full max-w-sm text-center space-y-4">
        <h3 className="font-semibold">Track This Paper</h3>
        <p className="text-sm text-muted-foreground">
          Sign in to add papers to your library, rate them, and write reviews.
        </p>
        <Button onClick={signInWithGoogle} className="w-full">
          <LogIn className="w-4 h-4 mr-2" />
          Sign In with Google
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6 w-full max-w-sm space-y-6">
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold mb-3">Add to Library</h3>
          <ShelfSelector
            currentShelf={userPaper?.shelf}
            onShelfChange={handleShelfChange}
          />
        </div>

        {userPaper && (
          <>
            <div>
              <h3 className="font-semibold mb-3">Rate this Paper</h3>
              <div className="flex items-center gap-3">
                <RatingStars
                  rating={userPaper.rating || 0}
                  onRatingChange={handleRatingChange}
                  size="lg"
                />
                {userPaper.rating && (
                  <span className="text-sm font-medium text-muted-foreground">
                    {userPaper.rating}/5
                  </span>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Review</h3>
              <ReviewForm
                initialReview={userPaper.review || ''}
                onSave={handleReviewSave}
                isLoading={isLoading}
              />
            </div>
          </>
        )}
      </div>
    </Card>
  );
}