import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Paper, PaperAggregates } from '@/types';
import { SearchBar } from '@/components/SearchBar';
import { PaperCard } from '@/components/PaperCard';
import { AuthButton } from '@/components/AuthButton';
import { getRecentPapers, getTrendingPapers, searchPapers, getPaperAggregates } from '@/lib/supabaseHelpers';
import { mapDatabasePaperToPaper } from '@/lib/dataClient';
import { GraduationCap, TrendingUp, Clock, Flame, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Header from '@/components/Header';

export default function HomePage() {
  console.log('HomePage component: Starting to render...');

  try {
    console.log('HomePage component: Rendering content...');
    const location = useLocation();
    const [papers, setPapers] = useState<Paper[]>([]);
    const [paperAggregates, setPaperAggregates] = useState<Record<string, PaperAggregates>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [searchResults, setSearchResults] = useState<Paper[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [viewMode, setViewMode] = useState<'recent' | 'trending'>('recent');
    const [error, setError] = useState<{ type: string; message: string; doi?: string } | null>(null);

  useEffect(() => {
    loadInitialData();
    checkForErrors();
  }, [viewMode]);

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

  const dismissError = () => {
    setError(null);
  };

  const loadInitialData = async () => {
    console.log('Loading initial data...');
    setIsLoading(true);
    try {
      console.log('Fetching papers with viewMode:', viewMode);
      const data = viewMode === 'recent' 
        ? await getRecentPapers(6) 
        : await getTrendingPapers(6);
      console.log('Fetched papers:', data);
      
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
          console.warn(`Failed to fetch aggregates for paper ${paper.id}:`, error);
          // Set default aggregate data
          aggregates[paper.id] = { avgRating: 0, count: 0, latest: [] };
        }
      }
      setPaperAggregates(aggregates);
    } catch (error) {
      console.error('Error loading papers:', error);
      // Set empty array on error to prevent white screen
      setPapers([]);
      setPaperAggregates({});
    } finally {
      setIsLoading(false);
    }
  };  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    try {
      const results = await searchPapers(query);
      // Map database format to TypeScript format
      const mappedResults = results.map(mapDatabasePaperToPaper);
      setSearchResults(mappedResults);
      setHasSearched(true);

      // Fetch aggregate data for search results
      const searchAggregates: Record<string, PaperAggregates> = {};
      for (const paper of mappedResults) {
        try {
          const aggregate = await getPaperAggregates(paper.id);
          searchAggregates[paper.id] = aggregate;
        } catch (error) {
          console.warn(`Failed to fetch aggregates for paper ${paper.id}:`, error);
          searchAggregates[paper.id] = { avgRating: 0, count: 0, latest: [] };
        }
      }
      // Update paperAggregates with search results
      setPaperAggregates(prev => ({ ...prev, ...searchAggregates }));
    } catch (error) {
      console.error('Error searching papers:', error);
    }
  };

  const displayedPapers = hasSearched ? searchResults : papers;

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
        <div className="text-center space-y-6 mb-12">
          <div className="flex justify-center">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <GraduationCap className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                Peerly: where peers rate what’s worth reading
              </h1>
            </div>
          </div>

          <div className="max-w-2xl mx-auto space-y-4">
            <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed">
              Track, rate, and review academic papers like Goodreads for research
            </p>
            <p className="text-base-academic md:text-base-academic-md text-muted-foreground">
              Discover research, organize your reading list, and build your academic library
            </p>

            {/* Quick Actions */}
            {/* Quick Actions moved to header */}
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <SearchBar
              onSearch={handleSearch}
              placeholder="Search by DOI (e.g., 10.1038/nature.2023.12345) or keywords..."
              autoFocus
            />
          </div>

        </div>

        {/* Results Section */}
        <div className="space-y-8">
          {hasSearched && (
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-semibold mb-2">
                Search Results
              </h2>
              <p className="text-muted-foreground">
                {searchResults.length} {searchResults.length === 1 ? 'paper' : 'papers'} found
              </p>
            </div>
          )}

          {!hasSearched && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-4 mb-6">
                <h2 className="text-2xl md:text-3xl font-semibold">
                  {viewMode === 'recent' ? 'Recent Papers' : 'Trending Papers'}
                </h2>

                <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                  <Button
                    variant={viewMode === 'recent' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('recent')}
                    className="gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    Recent
                  </Button>
                  <Button
                    variant={viewMode === 'trending' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('trending')}
                    className="gap-2"
                  >
                    <Flame className="w-4 h-4" />
                    Trending
                  </Button>
                </div>
              </div>

              <p className="text-muted-foreground">
                {viewMode === 'recent'
                  ? 'Discover the latest research across disciplines'
                  : 'Popular papers based on ratings and engagement'
                }
              </p>
            </div>
          )}

          {/* Papers Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="academic-card p-6 animate-pulse">
                  <div className="space-y-4">
                    <div className="h-6 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-20 bg-muted rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : displayedPapers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground">
                {hasSearched ? (
                  <>
                    <p className="text-lg mb-2">No papers found</p>
                    <p className="text-sm">Try searching with different keywords or a DOI</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg mb-2">No papers available</p>
                    <p className="text-sm">Check back soon for new research</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedPapers.map((paper) => (
                <PaperCard
                  key={paper.id}
                  paper={paper}
                  showAbstract
                  aggregates={paperAggregates[paper.id]}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
  } catch (error) {
    console.error('HomePage component: Error during render:', error);
    return <div style={{ padding: '20px', color: 'red' }}>HomePage Error: {error.message}</div>;
  }
}