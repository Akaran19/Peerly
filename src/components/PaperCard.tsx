import { Link, useNavigate } from 'react-router-dom';
import { Paper, PaperAggregates } from '@/types';
import { paperUrl } from '@/lib/routing';
import { formatDOIUrl } from '@/lib/doi';
import { ExternalLink, Users, Calendar, BookOpen, Star, Plus, Heart, Loader2, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RatingStars } from '@/components/RatingStars';
import { PaperActions } from '@/components/PaperActions';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { dataClient } from '@/lib/dataClient';

interface PaperCardProps {
  paper: Paper;
  showAbstract?: boolean;
  aggregates?: PaperAggregates;
  showActions?: boolean;
}

export function PaperCard({ paper, showAbstract = false, aggregates, showActions = false }: PaperCardProps) {
  const [showActionBar, setShowActionBar] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Helper function to generate Google Scholar URL for author search
  const getGoogleScholarUrl = (authorName: string): string => {
    const encodedAuthor = encodeURIComponent(`"${authorName}"`);
    return `https://scholar.google.com/scholar?q=author:${encodedAuthor}`;
  };

  // Handle paper navigation with loading
  const handlePaperClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    try {
      // If paper has a DOI, try to fetch/update the paper data first
      if (paper.doi) {
        const paperData = await dataClient.lookupPaperByDOI(paper.doi);
        if (paperData) {
          // Navigate to the paper page
          const paperLink = getPaperLink();
          navigate(paperLink);
          return;
        }
      }

      // If no DOI or lookup failed, navigate directly
      const paperLink = getPaperLink();
      navigate(paperLink);
    } catch (error) {
      console.error('Error loading paper data:', error);
      // Navigate anyway if there's an error
      const paperLink = getPaperLink();
      navigate(paperLink);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine the correct link URL based on paper data
  const getPaperLink = () => {
    // If paper has a DOI, use the new DOI-based routing
    if (paper.doi) {
      return `/paper/doi-${encodeURIComponent(paper.doi)}`;
    }
    
    // For papers with regular UUID IDs, use the standard paper URL
    if (paper.id && paper.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return paperUrl(paper);
    }
    
    // For web results or other temporary IDs, try to use DOI if available
    if (paper.doi) {
      return `/paper/doi-${encodeURIComponent(paper.doi)}`;
    }
    
    // Fallback: use the paper ID as-is (might not work but better than nothing)
    return `/paper/${encodeURIComponent(paper.id || paper.title || 'unknown')}`;
  };

  // Get external link for papers without DOI
  const getExternalLink = () => {
    if (paper.doi) {
      return formatDOIUrl(paper.doi);
    }
    // For OpenAlex papers, try to construct a link
    if (paper.id && paper.id.startsWith('http')) {
      return paper.id;
    }
    // Fallback: search on Google Scholar
    const query = encodeURIComponent(`"${paper.title}" ${paper.authors?.[0] || ''}`);
    return `https://scholar.google.com/scholar?q=${query}`;
  };

  return (
    <div className="academic-card p-6 space-y-4 relative group">
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
          <div
            onClick={handlePaperClick}
            className="flex-1 group min-w-0 cursor-pointer"
          >
            <h3 className="text-lg md:text-xl font-semibold leading-tight group-hover:text-primary transition-colors pr-2 flex items-center gap-2">
              {paper.title}
              {isLoading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
            </h3>
          </div>
          <a
            href={getExternalLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 p-2 text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md self-start"
            aria-label={paper.doi ? `View paper at ${paper.doi}` : "View paper externally"}
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-muted-foreground">
          {paper.authors && paper.authors.length > 0 && (
            <div className="flex items-start gap-1.5 min-w-0 flex-1">
              <Users className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <a
                href={getGoogleScholarUrl(paper.authors[0])}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors underline decoration-transparent hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm break-words"
                title={`Search for ${paper.authors[0]}'s publications on Google Scholar`}
              >
                {paper.authors.slice(0, 2).join(', ')}
                {paper.authors.length > 2 && ` +${paper.authors.length - 2} more`}
              </a>
            </div>
          )}
          
          {paper.publishedDate && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Calendar className="w-4 h-4" />
              <span>{new Date(paper.publishedDate).getFullYear()}</span>
            </div>
          )}

          {paper.referencesCount && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <BookOpen className="w-4 h-4" />
              <span>{paper.referencesCount} refs</span>
            </div>
          )}

          {paper.citationCount && paper.citationCount > 0 && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <TrendingUp className="w-4 h-4" />
              <span>{paper.citationCount} citations</span>
            </div>
          )}
        </div>

        {(paper.journal || paper.conference) && (
          <div>
            <Badge variant="secondary" className="text-xs">
              {paper.journal || paper.conference}
            </Badge>
          </div>
        )}

        {/* Rating Display */}
        {aggregates && aggregates.count > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <div className="flex items-center gap-1">
              <RatingStars 
                rating={aggregates.avgRating} 
                readonly 
                size="sm" 
              />
              <span className="text-xs text-muted-foreground ml-1">
                {aggregates.avgRating.toFixed(1)}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              ({aggregates.count} {aggregates.count === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        )}

        {showAbstract && paper.abstract && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {paper.abstract}
          </p>
        )}
      </div>

      <div className="pt-2 border-t">
        <button
          onClick={handlePaperClick}
          disabled={isLoading}
          className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading...
            </>
          ) : (
            'View details →'
          )}
        </button>
      </div>

      {/* Sticky Action Bar */}
      {showActions && (
        <>
          {/* Mobile Action Bar - Less intrusive */}
          <div className="md:hidden fixed bottom-4 right-4 z-50">
            <Button
              onClick={() => setShowActionBar(!showActionBar)}
              className="rounded-full w-12 h-12 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              size="sm"
            >
              {showActionBar ? <Heart className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </Button>
          </div>

          {/* Mobile Action Bar Sheet */}
          {showActionBar && (
            <div className="md:hidden fixed bottom-20 left-4 right-4 z-40 bg-card border rounded-2xl shadow-xl p-4 focus-within:ring-2 focus-within:ring-primary/60 max-h-80 overflow-y-auto">
              <PaperActions
                paperId={paper.id}
                paper={{
                  doi: paper.doi,
                  title: paper.title,
                  authors: paper.authors,
                  year: paper.publishedDate ? new Date(paper.publishedDate).getFullYear() : undefined,
                  journal: paper.journal,
                  conference: paper.conference,
                  publisher: paper.publisher
                }}
              />
            </div>
          )}

          {/* Desktop Action Bar */}
          <div className="hidden md:block absolute top-4 right-4 z-30">
            <div className="bg-card/95 backdrop-blur-sm border rounded-xl shadow-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus-within:opacity-100">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowActionBar(!showActionBar)}
                  className="p-2 h-8 w-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <Star className="w-4 h-4" />
                </Button>
                {showActionBar && (
                  <div className="absolute top-full right-0 mt-2 w-80 bg-card border rounded-xl shadow-xl p-4 z-40">
                    <PaperActions
                      paperId={paper.id}
                      paper={{
                        doi: paper.doi,
                        title: paper.title,
                        authors: paper.authors,
                        year: paper.publishedDate ? new Date(paper.publishedDate).getFullYear() : undefined,
                        journal: paper.journal,
                        conference: paper.conference,
                        publisher: paper.publisher
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}