import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Paper, PaperAggregates } from '@/types';
import { dataClient } from '@/lib/dataClient';
import { extractPaperId, shouldRedirectForSlug, paperUrl } from '@/lib/routing';
import { formatDOIUrl } from '@/lib/doi';
import { PaperActions } from '@/components/PaperActions';
import { AggregateStats } from '@/components/AggregateStats';
import ReviewsCard from '@/components/ReviewsCard';
import { Calendar, Users, ExternalLink, BookOpen, TrendingUp, FileText, Globe, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getPaperByDOI, extractPaperMetadata, DisplayPaperMetadata } from '@/lib/crossref';
import Header from '@/components/Header';

export default function PaperPage() {
  const params = useParams();
  const navigate = useNavigate();
  const paperIdAndSlug = params.paperIdAndSlug as string;
  
  console.log('PaperPage component rendering for slug:', paperIdAndSlug);
  console.log('Params object:', params);
  
  const [paper, setPaper] = useState<Paper | null>(null);
  const [richMetadata, setRichMetadata] = useState<DisplayPaperMetadata | null>(null);
  const [isLoadingRichData, setIsLoadingRichData] = useState(false);
  const [aggregates, setAggregates] = useState<PaperAggregates | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isLoadingRef = useRef(false);

  // Helper function to generate Google Scholar URL for author search
  const getGoogleScholarUrl = (authorName: string): string => {
    const encodedAuthor = encodeURIComponent(`"${authorName}"`);
    return `https://scholar.google.com/scholar?q=author:${encodedAuthor}`;
  };

  useEffect(() => {
    // Reset loading state when slug changes
    setIsLoading(true);
    setNotFound(false);
    setPaper(null);
    setRichMetadata(null);
    setAggregates(null);
    isLoadingRef.current = false;
    
    loadPaperData();
  }, [paperIdAndSlug]);

  const loadPaperData = async () => {
    if (isLoadingRef.current) {
      console.log('Already loading data, skipping...');
      return;
    }
    
    isLoadingRef.current = true;
    console.log('Starting to load paper data...');
    
    try {
      const paperId = extractPaperId(paperIdAndSlug);
      console.log('Loading paper data for slug:', paperIdAndSlug, 'extracted ID:', paperId);
      console.log('Full slug length:', paperIdAndSlug.length);
      
      if (!paperId) {
        console.error('Could not extract paper ID from slug:', paperIdAndSlug);
        setNotFound(true);
        return;
      }
      
      const paperData = await dataClient.getPaperById(paperId);
      console.log('Fetched paper data:', paperData);
      
      if (!paperData || !paperData.id) {
        console.log('Paper not found or invalid data for ID:', paperId);
        setNotFound(true);
        return;
      }

      // Check if slug matches and redirect if needed
      const shouldRedirect = shouldRedirectForSlug(paperIdAndSlug, paperData.title);
      console.log('Should redirect for slug?', shouldRedirect, 'current slug:', paperIdAndSlug, 'title:', paperData.title);
      if (shouldRedirect) {
        const newUrl = paperUrl(paperData);
        console.log('Redirecting to:', newUrl);
        const currentPath = window.location.pathname;
        if (newUrl !== currentPath) {
          navigate(newUrl, { replace: true });
        } else {
          console.log('Redirect URL is same as current URL, skipping redirect');
        }
        return;
      }

      // Fetch rich metadata from multiple APIs for display (only if not already stored)
      let richMetadata = null;
            const needsRichData = !paperData.abstract;
      
      if (needsRichData) {
        setIsLoadingRichData(true);
        try {
          console.log('Fetching rich metadata from multiple APIs for DOI:', paperData.doi);
          const multiApiData = await getPaperByDOI(paperData.doi);
          if (multiApiData && multiApiData.title) {
            richMetadata = extractPaperMetadata(multiApiData);
            console.log('Rich metadata extracted:', richMetadata);
            
            // Update the database with the fresh metadata
            await dataClient.lookupPaperByDOI(paperData.doi); // This will trigger the update logic
          }
        } catch (error) {
          console.warn('Failed to fetch rich metadata, using stored data only:', error);
        } finally {
          setIsLoadingRichData(false);
        }
      } else {
        // Use stored data for rich metadata display
        richMetadata = {
          doi: paperData.doi,
          title: paperData.title,
          abstract: paperData.abstract,
          year: paperData.year,
          journal: paperData.journal || undefined,
          conference: paperData.conference || undefined,
          authors: paperData.authors || [], // Will be empty array if not stored
          referencesCount: paperData.referencesCount || undefined,
          citationCount: paperData.citationCount || undefined,
          publisher: paperData.publisher || undefined,
          type: paperData.type || undefined,
          pdfUrl: paperData.pdfUrl || undefined,
          htmlUrl: paperData.htmlUrl || undefined
        };
        console.log('Using stored rich metadata:', richMetadata);
      }

      // Load aggregates data
      const aggregatesData = await dataClient.getAggregatesForPaper(paperId);

      console.log('Setting paper data:', paperData);
      console.log('Setting rich metadata:', richMetadata);
      console.log('Setting aggregates:', aggregatesData);
      
      setPaper(paperData);
      setRichMetadata(richMetadata);
      setAggregates(aggregatesData);
      
      console.log('Data loading completed successfully');
    } catch (error) {
      console.error('Error loading paper:', error);
      setNotFound(true);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
      console.log('Loading state set to false, isLoading:', false);
    }
  };

  const handlePaperUpdate = async () => {
    if (paper) {
      // Refresh aggregates when user updates their paper
      const updatedAggregates = await dataClient.getAggregatesForPaper(paper.id);
      setAggregates(updatedAggregates);
    }
  };

  const handleRefreshMetadata = async () => {
    if (!paper) return;
    
    setIsRefreshing(true);
    try {
      console.log('Refreshing metadata from multiple APIs for DOI:', paper.doi);
      const multiApiData = await getPaperByDOI(paper.doi);
      if (multiApiData && multiApiData.title) {
        const freshMetadata = extractPaperMetadata(multiApiData);
        setRichMetadata(freshMetadata);
        
        // Update the database with fresh data
        await dataClient.lookupPaperByDOI(paper.doi);
        
        console.log('Metadata refreshed successfully');
      } else {
        console.warn('No valid data returned from APIs for refresh');
      }
    } catch (error) {
      console.error('Failed to refresh metadata:', error);
      // Don't show error to user, just log it
    } finally {
      setIsRefreshing(false);
    }
  };

  console.log('PaperPage render - isLoading:', isLoading, 'notFound:', notFound, 'paper:', paper);
  
  if (isLoading) {
    return (
      <div className="page-wrapper">
        <main className="page-container">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-muted rounded w-3/4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-6 bg-muted rounded w-1/2"></div>
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </div>
              </div>
              <div className="h-96 bg-muted rounded"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (notFound || !paper) {
    console.log('Rendering not found - notFound:', notFound, 'paper:', paper, 'isLoading:', isLoading);
    return (
      <div className="page-wrapper">
        <main className="page-container">
          <div className="text-center py-12">
            <h1 className="text-4xl font-bold mb-4">Paper Not Found</h1>
            <p className="text-muted-foreground mb-8">
              The paper you're looking for doesn't exist in our database.
            </p>
            <Link to="/" className="text-primary hover:underline">
              ← Back to search
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <Header />
      <main className="page-container">
        {/* Navigation */}
        <div className="mb-6">
          <Link 
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            ← Back to search
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title and Metadata */}
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                  {paper.title}
                </h1>
                <button
                  onClick={handleRefreshMetadata}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-secondary hover:bg-secondary/80 disabled:opacity-50 rounded-md transition-colors"
                  title="Refresh metadata from multiple APIs"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              {isLoadingRichData && (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                  Loading additional details...
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {/* Authors */}
                {(richMetadata?.authors && richMetadata.authors.length > 0) && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <div className="flex flex-wrap gap-1">
                      {richMetadata.authors.map((author: string, index: number) => (
                        <span key={index}>
                          <a
                            href={getGoogleScholarUrl(author)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors underline decoration-transparent hover:decoration-current"
                            title={`Search for ${author}'s publications on Google Scholar`}
                          >
                            {author}
                          </a>
                          {index < richMetadata.authors.length - 1 && <span className="text-muted-foreground">, </span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Publication Date */}
                {richMetadata?.publishedDate ? (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(richMetadata.publishedDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</span>
                  </div>
                ) : paper.year ? (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{paper.year}</span>
                  </div>
                ) : null}

                {/* References Count */}
                {richMetadata?.referencesCount && (
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <span>{richMetadata.referencesCount} references</span>
                  </div>
                )}

                {/* Citation Count */}
                {richMetadata?.citationCount && (
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    <span>{richMetadata.citationCount} citations</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {/* Journal or Conference */}
                {(richMetadata?.journal || richMetadata?.conference) && (
                  <Badge variant="secondary" className="hover:bg-primary/10 transition-colors">
                    {richMetadata.journal || richMetadata.conference}
                  </Badge>
                )}

                {/* Publisher */}
                {richMetadata?.publisher && (
                  <Badge variant="outline">
                    {richMetadata.publisher}
                  </Badge>
                )}

                {/* Publication Type */}
                {richMetadata?.type && (
                  <Badge variant="outline">
                    {richMetadata.type.replace('-', ' ')}
                  </Badge>
                )}

                {/* DOI Link */}
                <a
                  href={formatDOIUrl(paper.doi)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  {paper.doi}
                </a>

                {/* PDF Link */}
                {richMetadata?.pdfUrl && (
                  <a
                    href={richMetadata.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <FileText className="w-4 h-4" />
                    PDF
                  </a>
                )}

                {/* HTML Link */}
                {richMetadata?.htmlUrl && (
                  <a
                    href={richMetadata.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-green-600 hover:underline"
                  >
                    <Globe className="w-4 h-4" />
                    HTML
                  </a>
                )}
              </div>

              {/* Additional Metadata */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                {/* No additional metadata to display after optimization */}
              </div>

              {aggregates && (
                <div className="py-4 border-y">
                  <AggregateStats aggregates={aggregates} />
                </div>
              )}
            </div>

            {/* Abstract */}
            {(richMetadata?.abstract || paper.abstract) && (
              <>
                <div className="academic-card p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Abstract
                  </h2>
                  <p className="text-base-academic md:text-base-academic-md leading-relaxed text-muted-foreground">
                    {richMetadata?.abstract || paper.abstract}
                  </p>
                </div>
                <ReviewsCard paperId={paper.id} limit={3} />
              </>
            )}
          </div>

          {/* Sidebar Actions */}
          <div className="lg:sticky lg:top-6">
            <PaperActions 
              paperId={paper.id} 
              onUpdate={handlePaperUpdate}
            />
          </div>
        </div>
      </main>
    </div>
  );
}