import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Paper } from '@/types';
import { SearchBar } from '@/components/SearchBar';
import { PaperCard } from '@/components/PaperCard';
import { AuthButton } from '@/components/AuthButton';
import { getRecentPapers, getTrendingPapers, searchPapers } from '@/lib/supabaseHelpers';
import { GraduationCap, TrendingUp, Clock, BookOpen, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<Paper[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [viewMode, setViewMode] = useState<'recent' | 'trending'>('recent');

  useEffect(() => {
    loadInitialData();
  }, [viewMode]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const data = viewMode === 'recent' 
        ? await getRecentPapers(20) 
        : await getTrendingPapers(20);
      setPapers(data);
    } catch (error) {
      console.error('Error loading papers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    try {
      const results = await searchPapers(query);
      setSearchResults(results);
      setHasSearched(true);
    } catch (error) {
      console.error('Error searching papers:', error);
    }
  };

  const displayedPapers = hasSearched ? searchResults : papers;

  return (
    <div className="page-wrapper">
      {/* Header */}
      <header className="flex items-center justify-between py-6 px-4 md:px-8 border-b bg-background">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-8 h-8 text-primary" />
          <span className="text-2xl font-bold text-foreground">Peerly</span>
        </div>
        <nav className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/profile">My Profile</Link>
          </Button>
          <AuthButton />
        </nav>
      </header>
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

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span>8 Papers Tracked</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span>6 Journals Indexed</span>
            </div>
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
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}