import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Paper, PaperAggregates } from '@/types';
import { dataClient } from '@/lib/dataClient';
import { extractPaperId, shouldRedirectForSlug, paperUrl } from '@/lib/routing';
import { formatDOIUrl, decodeDOIFromUrl } from '@/lib/doi';
import { trackPaperView } from '@/lib/analytics';
import { PaperActions } from '@/components/PaperActions';
import { AggregateStats } from '@/components/AggregateStats';
import ReviewsCard from '@/components/ReviewsCard';
import { Calendar, Users, ExternalLink, BookOpen, TrendingUp, FileText, Globe, RefreshCw, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getPaperByDOI, extractPaperMetadata, DisplayPaperMetadata } from '@/lib/crossref';
import Header from '@/components/Header';

export default function PaperPage() {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const paperIdAndSlug = params.paperIdAndSlug as string;

  const [paper, setPaper] = useState<Paper | null>(null);
  const [richMetadata, setRichMetadata] = useState<DisplayPaperMetadata | null>(null);
  const [isLoadingRichData, setIsLoadingRichData] = useState(false);
  const [aggregates, setAggregates] = useState<PaperAggregates | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to generate Google Scholar URL for author search
  const getGoogleScholarUrl = (authorName: string): string => {
    const encodedAuthor = encodeURIComponent(`"${authorName}"`);
    return `https://scholar.google.com/scholar?q=author:${encodedAuthor}`;
  };

  useEffect(() => {
    // Check if paper data was passed via location state
    const locationState = location.state as { paper?: Paper };
    if (locationState?.paper) {
      console.log('PaperPage: Using paper data from location state', locationState.paper);
      setPaper(locationState.paper);
      loadAggregates(locationState.paper.id);
      loadRichMetadata(locationState.paper);
      setIsLoading(false);
      
      // Track paper view
      trackPaperView(locationState.paper.id, locationState.paper.title);
      return;
    }

    // Fallback: load paper data from URL
    loadPaperData();
  }, [paperIdAndSlug]);

  const loadPaperData = async () => {
    try {
      let paperId = extractPaperId(paperIdAndSlug);
      console.log('PaperPage: Loading paper data for', paperIdAndSlug, 'extracted paperId:', paperId);

      if (!paperId) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      const paperData = await dataClient.getPaperById(paperId);

      if (!paperData || !paperData.id) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      // Check if slug matches and redirect if needed
      const shouldRedirect = shouldRedirectForSlug(paperIdAndSlug, paperData.title);
      if (shouldRedirect) {
        const newUrl = paperUrl(paperData);
        const currentPath = window.location.pathname;
        if (newUrl !== currentPath) {
          navigate(newUrl, { replace: true, state: { paper: paperData } });
          return;
        }
      }

      setPaper(paperData);
      loadAggregates(paperData.id);
      loadRichMetadata(paperData);
      
      // Track paper view
      trackPaperView(paperData.id, paperData.title);
    } catch (error) {
      console.error('PaperPage: Error loading paper data', error);
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAggregates = async (paperId: string) => {
    try {
      const aggregatesData = await dataClient.getAggregatesForPaper(paperId);
      setAggregates(aggregatesData);
    } catch (error) {
      console.error('PaperPage: Error loading aggregates', error);
    }
  };

  const loadRichMetadata = async (paperData: Paper) => {
    // Fetch rich metadata from multiple APIs for display (only if not already stored)
    const needsRichData = !paperData.abstract;

    if (needsRichData) {
      setIsLoadingRichData(true);
      try {
        // Use the existing lookupPaperByDOI which already handles API calls and caching
        const freshPaperData = await dataClient.lookupPaperByDOI(paperData.doi);
        if (freshPaperData && freshPaperData.abstract) {
          const richMetadata = {
            doi: freshPaperData.doi,
            title: freshPaperData.title,
            abstract: freshPaperData.abstract,
            year: freshPaperData.year,
            journal: freshPaperData.journal || undefined,
            conference: freshPaperData.conference || undefined,
            authors: freshPaperData.authors || [],
            referencesCount: freshPaperData.referencesCount || undefined,
            citationCount: freshPaperData.citationCount || undefined,
            publisher: freshPaperData.publisher || undefined,
            type: freshPaperData.type || undefined,
            pdfUrl: freshPaperData.pdfUrl || undefined,
            htmlUrl: freshPaperData.htmlUrl || undefined,
            sources: ['Semantic Scholar', 'OpenAlex', 'CrossRef'] // Add sources property
          };
          setRichMetadata(richMetadata);
          // Update the paper state with fresh data
          setPaper(freshPaperData);
        }
      } catch (error) {
        // Failed to fetch rich metadata, using stored data only
      } finally {
        setIsLoadingRichData(false);
      }
    } else {
      // Use stored data for rich metadata display
      const richMetadata = {
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
        htmlUrl: paperData.htmlUrl || undefined,
        sources: ['Database'] // Add sources property
      };
      setRichMetadata(richMetadata);
    }
  };

  const handlePaperUpdate = async () => {
    if (paper) {
      try {
        const updatedAggregates = await dataClient.getAggregatesForPaper(paper.id);
        setAggregates(updatedAggregates);
      } catch (error) {
        console.error('Error updating aggregates:', error);
      }
    }
  };

  const handleRefreshMetadata = async () => {
    if (!paper) return;

    setIsRefreshing(true);
    try {
      // Use refreshPaperByDOI to explicitly fetch fresh data from APIs
      const freshPaperData = await dataClient.refreshPaperByDOI(paper.doi);
      if (freshPaperData && freshPaperData.abstract) {
        const freshMetadata = {
          doi: freshPaperData.doi,
          title: freshPaperData.title,
          abstract: freshPaperData.abstract,
          year: freshPaperData.year,
          journal: freshPaperData.journal || undefined,
          conference: freshPaperData.conference || undefined,
          authors: freshPaperData.authors || [],
          referencesCount: freshPaperData.referencesCount || undefined,
          citationCount: freshPaperData.citationCount || undefined,
          publisher: freshPaperData.publisher || undefined,
          type: freshPaperData.type || undefined,
          pdfUrl: freshPaperData.pdfUrl || undefined,
          htmlUrl: freshPaperData.htmlUrl || undefined,
          sources: ['Semantic Scholar', 'OpenAlex', 'CrossRef'] // Add sources property
        };
        setRichMetadata(freshMetadata);
        // Update the paper state with fresh data
        setPaper(freshPaperData);
      }
    } catch (error) {
      // Don't show error to user, just log it
      console.error('Error refreshing paper metadata:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-wrapper">
        <main className="page-container">
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
            <div className="flex items-center space-x-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Loading Paper</h2>
                <p className="text-muted-foreground">
                  Preparing paper details...
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (notFound || !paper) {
    return (
      <div className="page-wrapper">
        <main className="page-container">
          <div className="text-center py-12">
            <h1 className="text-4xl font-bold mb-4">Paper Not Found</h1>
            <div className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              {error ? (
                <div className="bg-muted/50 p-4 rounded-lg text-left">
                  <p className="whitespace-pre-line">{error}</p>
                </div>
              ) : (
                <p>The paper you're looking for doesn't exist in our database.</p>
              )}
            </div>
            <Link to="/" className="text-primary hover:underline">
              ← Back to search
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{paper.title} | Peerly</title>
        <meta name="description" content={`${paper.title} - ${richMetadata?.abstract?.substring(0, 160) || paper.abstract?.substring(0, 160) || 'Academic paper review and rating'}`} />
        <meta name="keywords" content={`academic paper, research, ${paper.doi}, ${richMetadata?.authors?.join(', ') || paper.authors?.join(', ') || ''}`} />

        {/* Canonical URL */}
        <link rel="canonical" href={`https://peerly.app${paperUrl(paper)}`} />

        {/* Open Graph */}
        <meta property="og:title" content={`${paper.title} | Peerly`} />
        <meta property="og:description" content={`${paper.title} - ${richMetadata?.abstract?.substring(0, 160) || paper.abstract?.substring(0, 160) || 'Academic paper review and rating'}`} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://peerly.app${paperUrl(paper)}`} />
        <meta property="og:image" content="https://peerly.app/og-image.svg" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${paper.title} | Peerly`} />
        <meta name="twitter:description" content={`${paper.title} - ${richMetadata?.abstract?.substring(0, 160) || paper.abstract?.substring(0, 160) || 'Academic paper review and rating'}`} />
        <meta name="twitter:image" content="https://peerly.app/og-image.svg" />

        {/* Article specific meta tags */}
        {richMetadata?.authors && (
          <meta property="article:author" content={richMetadata.authors.join(', ')} />
        )}
        {richMetadata?.publishedDate && (
          <meta property="article:published_time" content={richMetadata.publishedDate} />
        )}
        {richMetadata?.journal && (
          <meta property="article:section" content={richMetadata.journal} />
        )}
      </Helmet>

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
              <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-4">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight">
                  {paper.title}
                </h1>
                <button
                  onClick={handleRefreshMetadata}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-secondary hover:bg-secondary/80 disabled:opacity-50 rounded-md transition-colors self-start sm:self-auto"
                  title="Refresh metadata from multiple APIs"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
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
          <div className="lg:static lg:bottom-auto lg:left-auto lg:right-auto z-50 bg-background/95 backdrop-blur-sm border-t lg:border-t-0 p-4 lg:p-0 lg:bg-transparent lg:backdrop-blur-none lg:border-0">
            <PaperActions
              paperId={paper.id}
              paper={{
                doi: paper.doi,
                title: paper.title,
                authors: richMetadata?.authors || paper.authors || [],
                year: richMetadata?.year || paper.year,
                journal: richMetadata?.journal || paper.journal,
                conference: richMetadata?.conference || paper.conference,
                publisher: richMetadata?.publisher || paper.publisher
              }}
              onUpdate={handlePaperUpdate}
            />
          </div>
        </div>
      </main>
    </div>
    </>
  );
}
