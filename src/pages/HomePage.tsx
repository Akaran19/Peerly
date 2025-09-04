import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Paper, PaperAggregates } from '@/types';
import { SearchBar } from '@/components/SearchBar';
import { PaperCard } from '@/components/PaperCard';
import { PaperCardSkeleton } from '@/components/PaperCardSkeleton';
import { AuthButton } from '@/components/AuthButton';
import { getRecentPapers, getTrendingPapers, getPaperAggregates } from '@/lib/supabaseHelpers';
import { mapDatabasePaperToPaper, dataClient } from '@/lib/dataClient';
import { paperDoiUrl, paperPmidUrl } from '@/lib/routing';
import { paperUrl } from '@/lib/routing';
import { GraduationCap, TrendingUp, Clock, Flame, AlertCircle, X, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header';

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

  useEffect(() => {
    loadInitialData();
    checkForErrors();
  }, [viewMode, trendingPeriod, currentPage]);

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

  return (
    <div className="page-wrapper">
      <Header />

      {/* Error Alert */}
      {error && (
        <div className="px-4 md:px-8 py-4">
          <Alert variant="destructive" className="max-w-4xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error.message}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={dismissError}
                className="h-auto p-1 ml-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <main className="page-container">
        {/* Hero Section */}
        <div className="text-center space-y-6 mb-8 md:mb-12">
          {/* Mobile: Logo above text */}
          <div className="flex justify-center md:hidden">
            <div className="p-3 bg-primary/10 rounded-2xl mb-4">
              <GraduationCap className="w-10 h-10 text-primary" />
            </div>
          </div>

          {/* Desktop: Logo inline with text */}
          <div className="hidden md:flex justify-center">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <GraduationCap className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                Find what's worth reading—fast.
              </h1>
            </div>
          </div>

          {/* Mobile: Text below logo */}
          <div className="md:hidden px-4">
            <h1 className="text-2xl font-bold text-foreground mb-4 leading-tight">
              Find what's worth reading—fast.
            </h1>
          </div>

          <div className="max-w-2xl mx-auto space-y-4 px-4 md:px-0">
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              See peer ratings, add your reviews, and keep your research on track.
            </p>
          </div>
        </div>        {/* Search Section */}
        <div className="max-w-2xl mx-auto mb-6 md:mb-8 px-4 md:px-0">
          <SearchBar onSearch={handleSearch} isSearching={isLoading} onPaperLoaded={handlePaperLoaded} />
          <p className="text-sm text-muted-foreground text-center mt-2">
            Choose DOI, PMID, or Keywords before searching.
          </p>
        </div>

        {/* Papers Section */}
        <div className="space-y-6 md:space-y-8 px-4 md:px-0" data-papers-section>
          <div className="text-center space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-4 md:mb-6">
              <h2 className="text-xl md:text-2xl font-semibold">
                {viewMode === 'recent' ? 'Recent Papers' : `Trending ${trendingPeriod === 'all' ? 'All Time' : trendingPeriod === 'month' ? 'This Month' : 'This Week'}`}
              </h2>

              <div className="flex items-center gap-2 bg-muted p-1 rounded-lg w-full sm:w-auto">
                <Button
                  variant={viewMode === 'recent' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleViewModeChange('recent')}
                  className="flex-1 sm:flex-none gap-1 sm:gap-2"
                >
                  <Clock className="w-4 h-4" />
                  <span className="hidden xs:inline">Recent</span>
                  <span className="xs:hidden">Recent</span>
                </Button>
                <Button
                  variant={viewMode === 'trending' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleViewModeChange('trending')}
                  className="flex-1 sm:flex-none gap-1 sm:gap-2"
                >
                  <Flame className="w-4 h-4" />
                  <span className="hidden xs:inline">Trending</span>
                  <span className="xs:hidden">Trending</span>
                </Button>
              </div>
            </div>            {viewMode === 'trending' && (
              <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                <span className="text-sm text-muted-foreground">Time period:</span>
                <div className="flex items-center gap-1 bg-background border rounded-lg p-1 overflow-x-auto">
                  <Button
                    variant={trendingPeriod === 'week' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleTrendingPeriodChange('week')}
                    className="text-xs px-2 sm:px-3 py-1 whitespace-nowrap"
                  >
                    This Week
                  </Button>
                  <Button
                    variant={trendingPeriod === 'month' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleTrendingPeriodChange('month')}
                    className="text-xs px-2 sm:px-3 py-1 whitespace-nowrap"
                  >
                    This Month
                  </Button>
                  <Button
                    variant={trendingPeriod === 'all' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleTrendingPeriodChange('all')}
                    className="text-xs px-2 sm:px-3 py-1 whitespace-nowrap"
                  >
                    All Time
                  </Button>
                </div>
              </div>
            )}

            <p className="text-sm md:text-base text-muted-foreground px-4 md:px-0">
              {viewMode === 'recent'
                ? 'Discover the latest research across disciplines'
                : `Top-rated papers ${trendingPeriod === 'all' ? 'of all time' : `from ${trendingPeriod === 'month' ? 'this month' : 'this week'}`}`
              }
            </p>
          </div>

          {/* Papers Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {[...Array(6)].map((_, i) => (
                <PaperCardSkeleton key={i} showAbstract />
              ))}
            </div>
          ) : displayedPapers.length === 0 ? (
            <div className="text-center py-8 md:py-12">
              <div className="text-muted-foreground">
                <p className="text-lg mb-2">No papers available</p>
                <p className="text-sm">Check back soon for new research</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {displayedPapers.map((paper) => (
                <PaperCard
                  key={paper.id}
                  paper={paper}
                  showAbstract
                  aggregates={paperAggregates[paper.id]}
                  showActions
                  onPaperLoaded={handlePaperLoaded}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {viewMode === 'recent' && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {Math.min((currentPage - 1) * papersPerPage + 1, totalPapers)} to {Math.min(currentPage * papersPerPage, totalPapers)} of {totalPapers} papers
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || isLoading}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      disabled={isLoading}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || isLoading}
                className="gap-1"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}