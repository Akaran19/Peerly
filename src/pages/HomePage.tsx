import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Paper, PaperAggregates } from '@/types';
import { SearchBar } from '@/components/search/SearchBar';
import { PaperCard } from '@/components/paper/PaperCard';
import { PaperCardSkeleton } from '@/components/paper/PaperCardSkeleton';
import { AuthButton } from '@/components/layout/AuthButton';
import { getRecentPapers, getTrendingPapers, getPaperAggregates } from '@/lib/supabaseHelpers';
import { mapDatabasePaperToPaper, dataClient } from '@/lib/dataClient';
import { paperDoiUrl, paperPmidUrl, paperUrl } from '@/lib/routing';
import { trackSearch } from '@/lib/analytics';
import { AlertCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/layout/Header';
import { getTier, type Tier } from '@/lib/account';

export default function HomePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [paperAggregates, setPaperAggregates] = useState<Record<string, PaperAggregates>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'recent' | 'trending'>('recent');
  const [trendingPeriod, setTrendingPeriod] = useState<'week' | 'month' | 'all'>('all');
  const [isLoadingPaper, setIsLoadingPaper] = useState(false);
  const [loadedPaper, setLoadedPaper] = useState<Paper | null>(null);
  const [error, setError] = useState<{ type: string; message: string; doi?: string } | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPapers, setTotalPapers] = useState(0);
  const papersPerPage = 9;
  const [userTier, setUserTier] = useState<Tier>('free');

  useEffect(() => {
    loadInitialData();
    checkForErrors();
    loadUserTier();
  }, [viewMode, trendingPeriod, currentPage]);

  const loadUserTier = async () => {
    try {
      const tier = await getTier();
      setUserTier(tier);
    } catch (error) {
      console.error('Error loading user tier:', error);
      // Keep default 'free' tier on error
    }
  };

  const checkForErrors = () => {
    const urlParams = new URLSearchParams(location.search);
    const errorType = urlParams.get('error');
    const doi = urlParams.get('doi');

    if (errorType) {
      let message = '';
      switch (errorType) {
        case 'paper-not-found':
          message = doi
            ? `Paper not found for DOI: ${doi}. The DOI may be invalid or the paper may not be available in CrossRef.`
            : 'Paper not found.';
          break;
        case 'invalid-doi':
          message = 'Invalid DOI format. Please check the DOI and try again.';
          break;
        case 'invalid-doi-format':
          message = 'The DOI format is invalid. Please ensure it starts with "10." and follows the correct format.';
          break;
        case 'doi-resolution-failed':
          message = 'Failed to resolve the DOI. Please try again later or contact support if the problem persists.';
          break;
        default:
          message = 'An error occurred while processing your request.';
      }

      setError({ type: errorType, message, doi: doi || undefined });

      // Clear the error from URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('error');
      newUrl.searchParams.delete('doi');
      window.history.replaceState({}, '', newUrl.toString());
    }
  };

  const checkForSearchParams = async () => {
    // This function is no longer needed since search is handled directly
    // Keeping it for potential future use with URL parameters
  };

  const dismissError = () => {
    setError(null);
  };

  const handlePaperLoaded = (paper: Paper) => {
    setLoadedPaper(paper);
    // Navigate to the paper page with the loaded data
    const paperLink = paperUrl(paper);
    navigate(paperLink, { state: { paper } });
  };

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      let data, totalCount;
      if (viewMode === 'recent') {
        const result = await getRecentPapers(papersPerPage, (currentPage - 1) * papersPerPage);
        data = result.papers;
        totalCount = result.totalCount;
        setTotalPapers(totalCount);
        setTotalPages(Math.ceil(totalCount / papersPerPage));
      } else {
        data = await getTrendingPapers(12, trendingPeriod);
        totalCount = data.length;
        setTotalPapers(totalCount);
        setTotalPages(Math.ceil(totalCount / papersPerPage));
      }
      
      // Map database format to TypeScript format
      const mappedPapers = data.map(mapDatabasePaperToPaper);
      setPapers(mappedPapers);

      // Fetch aggregate data for all papers
      const aggregates: Record<string, PaperAggregates> = {};
      for (const paper of mappedPapers) {
        try {
          const aggregate = await getPaperAggregates(paper.id);
          aggregates[paper.id] = aggregate;
        } catch (error) {
          // Set default aggregate data
          aggregates[paper.id] = { avgRating: 0, count: 0, latest: [] };
        }
      }
      setPaperAggregates(aggregates);
    } catch (error) {
      // Set empty array on error to prevent white screen
      setPapers([]);
      setPaperAggregates({});
    } finally {
      setIsLoading(false);
    }
  };  const displayedPapers = papers;

  const handleSearch = (query: string, mode: 'doi' | 'pmid' | 'keywords') => {
    if (mode === 'keywords' && query.trim()) {
      // Perform keyword search
      performKeywordSearch(query.trim());
    }
    // DOI and PMID handled by SearchBar navigation
  };

  const performKeywordSearch = async (query: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const searchResults = await dataClient.keywordSearchPapers(query);
      setPapers(searchResults);
      setPaperAggregates({});
      setViewMode('recent'); // Switch to recent view to show search results
      setCurrentPage(1);
      setTotalPages(1);
      setTotalPapers(searchResults.length);
      
      // Track search event
      trackSearch(query, searchResults.length);
    } catch (error) {
      console.error('Search failed:', error);
      setError({ type: 'search-error', message: 'Search failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of papers section
    const papersSection = document.querySelector('[data-papers-section]');
    if (papersSection) {
      papersSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleViewModeChange = (mode: 'recent' | 'trending') => {
    setViewMode(mode);
    setCurrentPage(1); // Reset to first page when changing view mode
  };

  const handleTrendingPeriodChange = (period: 'week' | 'month' | 'all') => {
    setTrendingPeriod(period);
    setCurrentPage(1); // Reset to first page when changing period
  };

  const firstIndex = (currentPage - 1) * papersPerPage + 1;
  const periodLabel = trendingPeriod === 'all' ? 'all time' : trendingPeriod === 'month' ? 'this month' : 'this week';

  const tabClass = (active: boolean) =>
    `min-h-0 min-w-0 -mb-px border-b-2 pb-2 font-ident text-[11px] uppercase tracking-[0.16em] transition-colors ${
      active ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
    }`;

  return (
    <div className="page-wrapper">
      <Header />

      {error && (
        <div className="mx-auto max-w-6xl px-4 pt-6 md:px-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error.message}</span>
              <Button variant="ghost" size="sm" onClick={dismissError} className="ml-2 h-auto p-1" aria-label="Dismiss">
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <main className="page-container">
        {/* Masthead */}
        <section className="grid gap-10 border-b border-foreground/80 pb-10 pt-2 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-end">
          <div className="space-y-6">
            <p className="label-mono paper-reveal">Reading log &amp; peer reviews for research papers</p>
            <h1
              className="paper-reveal max-w-[14ch] font-editorial text-[2.9rem] font-normal leading-[0.95] tracking-[-0.035em] sm:text-6xl lg:text-[5.4rem]"
              style={{ '--reveal-delay': '80ms' } as React.CSSProperties}
            >
              Find what&rsquo;s worth <em className="font-normal italic text-primary">reading</em>.
            </h1>
            <p
              className="paper-reveal max-w-xl text-lg leading-relaxed text-muted-foreground"
              style={{ '--reveal-delay': '160ms' } as React.CSSProperties}
            >
              Look up any paper, see what your peers thought of it, and keep a shelf of what you&rsquo;ve read and what&rsquo;s next.
            </p>
          </div>

          <aside className="paper-reveal hidden space-y-5 border-l pl-6 lg:block" style={{ '--reveal-delay': '240ms' } as React.CSSProperties}>
            {totalPapers > 0 && (
              <div>
                <p className="font-editorial text-5xl leading-none tabular-nums">{totalPapers.toLocaleString()}</p>
                <p className="mt-2 label-mono">papers logged</p>
              </div>
            )}
            <ol className="space-y-2 text-sm text-muted-foreground">
              {['Look it up by DOI, PubMed ID or keywords', 'Put it on a shelf', 'Rate it and write a review'].map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="font-ident text-[11px] leading-5 text-foreground">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </aside>
        </section>

        {/* Search */}
        <section className="mx-auto mt-10 max-w-3xl" aria-label="Search papers">
          <SearchBar onSearch={handleSearch} isSearching={isLoading} onPaperLoaded={handlePaperLoaded} tier={userTier} />
        </section>

        {/* Index of papers */}
        <section className="mt-16" data-papers-section aria-labelledby="papers-heading">
          <div className="flex flex-col gap-4 border-b sm:flex-row sm:items-end sm:justify-between">
            <div className="pb-3">
              <h2 id="papers-heading" className="text-3xl md:text-4xl">
                {viewMode === 'recent' ? 'Recently logged' : 'Highest rated'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {viewMode === 'recent' ? 'The latest papers added by readers on Peerly.' : `Papers readers rated highest, ${periodLabel}.`}
              </p>
            </div>

            <div className="flex items-end gap-6">
              <button onClick={() => handleViewModeChange('recent')} className={tabClass(viewMode === 'recent')}>
                Recent
              </button>
              <button onClick={() => handleViewModeChange('trending')} className={tabClass(viewMode === 'trending')}>
                Top rated
              </button>
            </div>
          </div>

          {viewMode === 'trending' && (
            <div className="flex flex-wrap items-center gap-2 border-b py-3">
              <span className="label-mono mr-2">Period</span>
              {(['week', 'month', 'all'] as const).map(period => (
                <button
                  key={period}
                  onClick={() => handleTrendingPeriodChange(period)}
                  className={`min-h-0 rounded-sm border px-2.5 py-1 text-xs transition-colors ${
                    trendingPeriod === period
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-foreground/15 text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                  }`}
                >
                  {period === 'week' ? 'This week' : period === 'month' ? 'This month' : 'All time'}
                </button>
              ))}
            </div>
          )}

          {isLoading ? (
            <div className="divide-y">
              {[...Array(5)].map((_, i) => (
                <PaperCardSkeleton key={i} showAbstract row />
              ))}
            </div>
          ) : displayedPapers.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-editorial text-2xl">Nothing here yet.</p>
              <p className="mt-2 text-sm text-muted-foreground">Look up a paper above to start the log.</p>
            </div>
          ) : (
            <div className="divide-y">
              {displayedPapers.map((paper, i) => (
                <PaperCard
                  key={paper.id}
                  paper={paper}
                  index={firstIndex + i}
                  showAbstract
                  aggregates={paperAggregates[paper.id]}
                  showActions
                  onPaperLoaded={handlePaperLoaded}
                  tier={userTier}
                />
              ))}
            </div>
          )}

          {viewMode === 'recent' && totalPages > 1 && (
            <nav className="flex flex-col items-center justify-between gap-4 border-t border-foreground/80 pt-5 sm:flex-row" aria-label="Pagination">
              <p className="label-mono">
                {Math.min(firstIndex, totalPapers)}–{Math.min(currentPage * papersPerPage, totalPapers)} of {totalPapers}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || isLoading}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5 || currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  const active = currentPage === pageNum;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      disabled={isLoading}
                      aria-current={active ? 'page' : undefined}
                      className={`h-9 w-9 min-h-0 min-w-0 rounded-sm font-ident text-xs transition-colors ${
                        active ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || isLoading}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </nav>
          )}
        </section>
      </main>
    </div>
  );
}
