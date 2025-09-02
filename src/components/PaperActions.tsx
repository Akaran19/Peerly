import { useState, useEffect } from 'react';
import { UserPaper, Shelf } from '@/types';
import { ShelfSelector } from './ShelfSelector';
import { RatingStars } from './RatingStars';
import { ReviewForm } from './ReviewForm';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogIn, Copy, ExternalLink, Quote, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getUserPaper, upsertUserPaper } from '@/lib/supabaseHelpers';
import { formatDOIUrl } from '@/lib/doi';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PaperActionsProps {
  paperId: string;
  paper?: {
    doi: string;
    title: string;
    authors?: string[];
    year?: number;
    journal?: string;
    conference?: string;
    publisher?: string;
  };
  onUpdate?: (userPaper: UserPaper) => void;
}

export function PaperActions({ paperId, paper, onUpdate }: PaperActionsProps) {
  const { user, isGuest, signInWithGoogle } = useAuth();
  const [userPaper, setUserPaper] = useState<UserPaper | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showCitations, setShowCitations] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

  // Citation generation functions
  const generateAPA = () => {
    if (!paper) return '';
    const authors = paper.authors?.length
      ? paper.authors.length === 1
        ? paper.authors[0]
        : paper.authors.length === 2
        ? `${paper.authors[0]} & ${paper.authors[1]}`
        : `${paper.authors[0]} et al.`
      : 'Unknown Author';
    const year = paper.year || 'n.d.';
    const title = paper.title;
    const journal = paper.journal || paper.conference || '';
    const doi = paper.doi;
    return `${authors} (${year}). ${title}. ${journal}${journal ? '.' : ''} https://doi.org/${doi}`;
  };

  const generateMLA = () => {
    if (!paper) return '';
    const authors = paper.authors?.length
      ? paper.authors.length === 1
        ? paper.authors[0]
        : paper.authors.length === 2
        ? `${paper.authors[0]}, and ${paper.authors[1]}`
        : `${paper.authors[0]}, et al.`
      : 'Unknown Author';
    const title = paper.title;
    const journal = paper.journal || paper.conference || '';
    const year = paper.year || 'n.d.';
    const doi = paper.doi;
    return `${authors}. "${title}." ${journal}${journal ? ',' : ''} ${year}, doi:${doi}.`;
  };

  const generateChicago = () => {
    if (!paper) return '';
    const authors = paper.authors?.length
      ? paper.authors.length === 1
        ? paper.authors[0]
        : paper.authors.length === 2
        ? `${paper.authors[0]} and ${paper.authors[1]}`
        : `${paper.authors[0]}, et al.`
      : 'Unknown Author';
    const title = paper.title;
    const journal = paper.journal || paper.conference || '';
    const year = paper.year || 'n.d.';
    const doi = paper.doi;
    return `${authors}. "${title}." ${journal} ${year}. doi:${doi}.`;
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard.`,
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please copy manually.",
        variant: "destructive"
      });
    }
  };

  const copyDOI = () => copyToClipboard(paper?.doi || '', 'DOI');
  const openDOI = () => window.open(formatDOIUrl(paper?.doi || ''), '_blank');

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
    if (isGuest) {
      setShowSignInPrompt(true);
      return;
    }

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

  if (!user && !isGuest) {
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

  if (isGuest) {
    return (
      <TooltipProvider>
        <Card className="p-6 w-full max-w-sm space-y-6">
          {/* Sign-in prompt for guests */}
          {showSignInPrompt && (
            <Alert className="border-primary/20 bg-primary/5">
              <Save className="h-4 w-4" />
              <AlertDescription className="space-y-3">
                <p>Sign in to save your ratings, reviews, and library permanently.</p>
                <Button onClick={signInWithGoogle} size="sm" className="w-full">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In to Save
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-6">
            {/* DOI Actions */}
            {paper && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">DOI Actions</h3>
                <div className="flex gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyDOI}
                        className="flex-1"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy DOI
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy DOI to clipboard</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={openDOI}
                        className="flex-1"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open DOI
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Open DOI in new tab</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Citation Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCitations(!showCitations)}
                  className="w-full justify-start h-10 hover:bg-muted/50"
                >
                  <Quote className="w-4 h-4 mr-3" />
                  {showCitations ? 'Hide Citations' : 'Show Citations'}
                </Button>

                                {/* Citation Formats */}
                {showCitations && (
                  <div className="space-y-5 pt-3 border-t border-border/50">
                    <div className="text-center">
                      <h4 className="font-medium text-sm text-muted-foreground mb-4">
                        Copy any citation format below
                      </h4>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-foreground">APA</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(generateAPA(), 'APA citation')}
                            className="h-8 px-3 hover:bg-primary/10 hover:border-primary/30"
                          >
                            <Copy className="w-3.5 h-3.5 mr-1.5" />
                            Copy
                          </Button>
                        </div>
                        <div className="bg-muted/70 p-4 rounded-lg border border-border/30">
                          <p className="text-sm text-foreground leading-relaxed font-mono break-words">
                            {generateAPA()}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-foreground">MLA</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(generateMLA(), 'MLA citation')}
                            className="h-8 px-3 hover:bg-primary/10 hover:border-primary/30"
                          >
                            <Copy className="w-3.5 h-3.5 mr-1.5" />
                            Copy
                          </Button>
                        </div>
                        <div className="bg-muted/70 p-4 rounded-lg border border-border/30">
                          <p className="text-sm text-foreground leading-relaxed font-mono break-words">
                            {generateMLA()}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-foreground">Chicago</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(generateChicago(), 'Chicago citation')}
                            className="h-8 px-3 hover:bg-primary/10 hover:border-primary/30"
                          >
                            <Copy className="w-3.5 h-3.5 mr-1.5" />
                            Copy
                          </Button>
                        </div>
                        <div className="bg-muted/70 p-4 rounded-lg border border-border/30">
                          <p className="text-sm text-foreground leading-relaxed font-mono break-words">
                            {generateChicago()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold text-base mb-2">Add to Library</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Choose how you want to track this paper
                </p>
              </div>
              <ShelfSelector
                currentShelf={userPaper?.shelf}
                onShelfChange={handleShelfChange}
                size="md"
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
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Card className="p-6 w-full max-w-sm space-y-6">
        <div className="space-y-6">
          {/* DOI Actions */}
          {paper && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">DOI Actions</h3>
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyDOI}
                      className="flex-1"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy DOI
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy DOI to clipboard</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openDOI}
                      className="flex-1"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open DOI
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Open DOI in new tab</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Citation Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCitations(!showCitations)}
                className="w-full justify-start h-10 hover:bg-muted/50"
              >
                <Quote className="w-4 h-4 mr-3" />
                {showCitations ? 'Hide Citations' : 'Show Citations'}
              </Button>

              {/* Citation Formats */}
              {showCitations && (
                <div className="space-y-5 pt-3 border-t border-border/50">
                  <div className="text-center">
                    <h4 className="font-medium text-sm text-muted-foreground mb-4">
                      Copy any citation format below
                    </h4>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">APA</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(generateAPA(), 'APA citation')}
                          className="h-8 px-3 hover:bg-primary/10 hover:border-primary/30"
                        >
                          <Copy className="w-3.5 h-3.5 mr-1.5" />
                          Copy
                        </Button>
                      </div>
                      <div className="bg-muted/70 p-4 rounded-lg border border-border/30">
                        <p className="text-sm text-foreground leading-relaxed font-mono break-words">
                          {generateAPA()}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">MLA</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(generateMLA(), 'MLA citation')}
                          className="h-8 px-3 hover:bg-primary/10 hover:border-primary/30"
                        >
                          <Copy className="w-3.5 h-3.5 mr-1.5" />
                          Copy
                        </Button>
                      </div>
                      <div className="bg-muted/70 p-4 rounded-lg border border-border/30">
                        <p className="text-sm text-foreground leading-relaxed font-mono break-words">
                          {generateMLA()}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">Chicago</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(generateChicago(), 'Chicago citation')}
                          className="h-8 px-3 hover:bg-primary/10 hover:border-primary/30"
                        >
                          <Copy className="w-3.5 h-3.5 mr-1.5" />
                          Copy
                        </Button>
                      </div>
                      <div className="bg-muted/70 p-4 rounded-lg border border-border/30">
                        <p className="text-sm text-foreground leading-relaxed font-mono break-words">
                          {generateChicago()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="text-center">
              <h3 className="font-semibold text-base mb-2">Add to Library</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Choose how you want to track this paper
              </p>
            </div>
            <ShelfSelector
              currentShelf={userPaper?.shelf}
              onShelfChange={handleShelfChange}
              size="md"
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
    </TooltipProvider>
  );
}
