import { Link, useNavigate } from 'react-router-dom';
import { Paper, PaperAggregates } from '@/types';
import { paperUrl } from '@/lib/routing';
import { formatDOIUrl } from '@/lib/doi';
import { ArrowUpRight, Loader2, Plus, X } from 'lucide-react';
import { RatingStars } from '@/components/reviews/RatingStars';
import { PaperActions } from '@/components/paper/PaperActions';
import { useState } from 'react';
import { cleanAbstract, decodeEntities } from '@/lib/api/enrichment';
import { dataClient } from '@/lib/dataClient';
import { type Tier } from '@/lib/tier';

interface PaperCardProps {
  paper: Paper;
  showAbstract?: boolean;
  aggregates?: PaperAggregates;
  showActions?: boolean;
  onPaperLoaded?: (paper: Paper) => void;
  tier?: Tier;
  // When set, renders as a numbered row in a ruled list instead of a boxed card
  index?: number;
}

export function PaperCard({ paper, showAbstract = false, aggregates, showActions = false, onPaperLoaded, tier = 'free', index }: PaperCardProps) {
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
          // If we have a callback, use it
          if (onPaperLoaded) {
            onPaperLoaded(paperData);
          } else {
            // Navigate to the paper page
            const paperLink = getPaperLink();
            navigate(paperLink, { state: { paper: paperData } });
          }
          return;
        }
      }

      // If no DOI or lookup failed, navigate directly
      if (onPaperLoaded) {
        onPaperLoaded(paper);
      } else {
        const paperLink = getPaperLink();
        navigate(paperLink, { state: { paper } });
      }
    } catch (error) {
      console.error('Error loading paper data:', error);
      // Navigate anyway if there's an error
      if (onPaperLoaded) {
        onPaperLoaded(paper);
      } else {
        const paperLink = getPaperLink();
        navigate(paperLink, { state: { paper } });
      }
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

  const title = decodeEntities(paper.title);
  const abstract = showAbstract ? cleanAbstract(paper.abstract) : undefined;
  const venue = paper.journal || paper.conference;
  const year = paper.publishedDate ? new Date(paper.publishedDate).getFullYear() : paper.year;
  const isRow = index !== undefined;

  return (
    <article
      className={`group relative ${
        isRow
          ? 'grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 py-6 sm:grid-cols-[3rem_minmax(0,1fr)_7rem] sm:gap-x-5'
          : 'academic-card flex h-full flex-col p-5'
      }`}
    >
      {isRow && (
        <span className="pt-1 font-ident text-xs text-muted-foreground" aria-hidden>
          {String(index).padStart(2, '0')}
        </span>
      )}

      <div className="min-w-0 space-y-2">
        {(venue || year) && (
          <p className="label-mono truncate">
            {venue}
            {venue && year && <span className="mx-1.5 opacity-50">/</span>}
            {year}
          </p>
        )}

        <h3 className="text-[1.3rem] leading-[1.2] sm:text-[1.45rem]">
          <a
            href={getPaperLink()}
            onClick={handlePaperClick}
            className="decoration-primary/40 decoration-1 underline-offset-4 transition-colors hover:text-primary hover:underline"
          >
            {title}
          </a>
          {isLoading && <Loader2 className="ml-2 inline h-4 w-4 animate-spin text-primary" />}
        </h3>

        {paper.authors && paper.authors.length > 0 && (
          <p className="text-sm text-muted-foreground">
            <a
              href={getGoogleScholarUrl(paper.authors[0])}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
              title={`Search for ${paper.authors[0]}'s publications on Google Scholar`}
            >
              {paper.authors.slice(0, 3).join(', ')}
              {paper.authors.length > 3 && ` and ${paper.authors.length - 3} more`}
            </a>
          </p>
        )}

        {abstract && (
          <p className="line-clamp-2 max-w-[68ch] font-editorial text-[15.5px] leading-relaxed text-foreground/75">
            {abstract}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-sm">
          {aggregates && aggregates.count > 0 && (
            <span className="flex items-center gap-1.5 [&_button]:min-h-0 [&_button]:min-w-0">
              <RatingStars rating={aggregates.avgRating} readonly size="sm" />
              <span className="font-ident text-[11px] text-muted-foreground">
                {aggregates.avgRating.toFixed(1)} · {aggregates.count} {aggregates.count === 1 ? 'review' : 'reviews'}
              </span>
            </span>
          )}

          <button
            onClick={handlePaperClick}
            disabled={isLoading}
            className="min-h-0 min-w-0 font-medium text-foreground underline decoration-foreground/25 underline-offset-4 transition-colors hover:decoration-foreground disabled:opacity-50"
          >
            {isLoading ? 'Opening…' : 'Read more'}
          </button>

          {showActions && (
            <button
              onClick={() => setShowActionBar(open => !open)}
              aria-expanded={showActionBar}
              className="inline-flex min-h-0 min-w-0 items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              {showActionBar ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {showActionBar ? 'Close' : 'Add to shelf'}
            </button>
          )}

          <a
            href={getExternalLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
            aria-label={paper.doi ? `Open ${paper.doi} at the publisher` : 'View paper externally'}
          >
            {paper.doi ? 'DOI' : 'Source'}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>

        {showActions && showActionBar && (
          <div className="pt-3 [&>div]:max-w-none">
            <PaperActions
              paperId={paper.id}
              paper={{
                doi: paper.doi,
                title: paper.title,
                authors: paper.authors,
                year,
                journal: paper.journal,
                conference: paper.conference,
                publisher: paper.publisher
              }}
              tier={tier}
            />
          </div>
        )}
      </div>

      {isRow && (
        <div className="hidden text-right sm:block">
          {paper.citationCount ? (
            <>
              <p className="font-editorial text-2xl leading-none tabular-nums">{paper.citationCount.toLocaleString()}</p>
              <p className="mt-1 label-mono">citations</p>
            </>
          ) : null}
        </div>
      )}
    </article>
  );
}
