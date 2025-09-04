import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Paper, PaperAggregates } from '@/types';
import { dataClient } from '@/lib/dataClient';
import { extractPaperId, shouldRedirectForSlug, paperUrl } from '@/lib/routing';
import { formatDOIUrl, decodeDOIFromUrl } from '@/lib/doi';
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
  const paperIdAndSlug = params.paperIdAndSlug as string;

  const [paper, setPaper] = useState<Paper | null>(null);
  const [richMetadata, setRichMetadata] = useState<DisplayPaperMetadata | null>(null);
  const [isLoadingRichData, setIsLoadingRichData] = useState(false);
  const [aggregates, setAggregates] = useState<PaperAggregates | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLookupLoading, setIsLookupLoading] = useState(false);
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
    setError(null);
    setIsLookupLoading(false);
    isLoadingRef.current = false;

    console.log('PaperPage: useEffect triggered for', paperIdAndSlug);
    loadPaperData();
  }, [paperIdAndSlug]);

  const loadPaperData = async () => {
    if (isLoadingRef.current) {
      console.log('PaperPage: loadPaperData skipped due to loading ref');
      return;
    }

    isLoadingRef.current = true;
    console.log('PaperPage: loadPaperData started');

    try {
      let paperId = extractPaperId(paperIdAndSlug);
      console.log('PaperPage: Loading paper data for', paperIdAndSlug, 'extracted paperId:', paperId);

      // Handle DOI-based lookups
      if (paperIdAndSlug.startsWith('doi-')) {
        const encodedDoi = paperIdAndSlug.replace('doi-', '');
        const doi = decodeDOIFromUrl(encodedDoi);
        console.log('PaperPage: Handling DOI lookup for', doi);

        // First check if this came from a search result (web- prefix)
        const isFromSearch = paperIdAndSlug.includes('web-');

        // Show loading state during lookup
        setIsLookupLoading(true);
        setIsLoading(false); // Hide the main loading to show lookup loading

        try {
          const paperData = await dataClient.lookupPaperByDOI(doi);
          console.log('PaperPage: DOI lookup result', paperData);
          if (paperData) {
            // If the returned paper has a proper UUID ID, redirect to the standard URL
            if (paperData.id && paperData.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
              const newUrl = paperUrl(paperData);
              console.log('PaperPage: Redirecting to:', newUrl);
              navigate(newUrl, { replace: true });
              // Reset loading state after redirect
              setIsLoading(false);
              isLoadingRef.current = false;
              setIsLookupLoading(false);
              return;
            } else {
              // For web results or guest mode, use the paper data directly
              console.log('PaperPage: Using paper data directly (no redirect)');
              setPaper(paperData);
              setAggregates(await dataClient.getAggregatesForPaper(paperData.id));
              setIsLookupLoading(false);
              setIsLoading(false);
              isLoadingRef.current = false;
              return;
            }
          } else {
            console.log('PaperPage: DOI lookup returned null');
            // Show a more informative error message
            const errorMessage = isFromSearch
              ? `This paper was found in search results but the DOI "${doi}" could not be verified in academic databases. This may happen when:\n• The paper metadata is incomplete or outdated\n• The DOI format is unusual\n• The paper exists but isn't indexed by our data sources\n\nTry searching for the paper by title or author name instead.`
              : `The DOI "${doi}" was not found in any academic databases (CrossRef, OpenAlex, or Semantic Scholar).\n\nThis could mean:\n• The DOI is incorrect or contains a typo\n• The paper was published in a journal not indexed by these services\n• The paper may be too old or from a very specialized field\n\nPlease verify the DOI is correct and try again.`;
            setError(errorMessage);
            setIsLookupLoading(false);
            setIsLoading(false);
            isLoadingRef.current = false;
            return;
          }
        } catch (doiError) {
          console.error('PaperPage: Error in DOI lookup', doiError);
          setNotFound(true);
          setIsLookupLoading(false);
          setIsLoading(false);
          isLoadingRef.current = false;
          return;
        }
      }

      // Handle PMID-based lookups
      if (paperIdAndSlug.startsWith('pmid-')) {
        const pmid = paperIdAndSlug.replace('pmid-', '');
        console.log('PaperPage: Handling PMID lookup for', pmid);

        // Show loading state during lookup
        setIsLookupLoading(true);
        setIsLoading(false); // Hide the main loading to show lookup loading

        try {
          const paperData = await dataClient.lookupPaperByPMID(pmid);
          console.log('PaperPage: PMID lookup result', paperData);
          if (paperData) {
            // If the returned paper has a proper UUID ID, redirect to the standard URL
            if (paperData.id && paperData.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
              const newUrl = paperUrl(paperData);
              navigate(newUrl, { replace: true });
              // Reset loading state after redirect
              setIsLoading(false);
              isLoadingRef.current = false;
              setIsLookupLoading(false);
              return;
            } else {
              // For web results or guest mode, use the paper data directly
              setPaper(paperData);
              setAggregates(await dataClient.getAggregatesForPaper(paperData.id));
              setIsLookupLoading(false);
              setIsLoading(false);
              isLoadingRef.current = false;
              return;
            }
          } else {
            console.log('PaperPage: PMID lookup returned null');
            setError(`The PubMed ID "${pmid}" was not found in any academic databases. Please check that the PMID is correct and try again.`);
            setIsLookupLoading(false);
            setIsLoading(false);
            isLoadingRef.current = false;
            return;
          }
        } catch (pmidError) {
          console.error('PaperPage: Error in PMID lookup', pmidError);
          setNotFound(true);
          setIsLookupLoading(false);
          setIsLoading(false);
          isLoadingRef.current = false;
          return;
        }
      }

      // Skip the paperId check for DOI/PMID lookups since they were handled above
      if (paperIdAndSlug.startsWith('doi-') || paperIdAndSlug.startsWith('pmid-')) {
        // These should have been handled above, if we reach here something went wrong
        setNotFound(true);
        return;
      }

      if (!paperId) {
        setNotFound(true);
        setIsLoading(false);
        isLoadingRef.current = false;
        return;
      }

      const paperData = await dataClient.getPaperById(paperId);

      if (!paperData || !paperData.id) {
        setNotFound(true);
        setIsLoading(false);
        isLoadingRef.current = false;
        return;
      }

      // Check if slug matches and redirect if needed
      const shouldRedirect = shouldRedirectForSlug(paperIdAndSlug, paperData.title);
      if (shouldRedirect) {
        const newUrl = paperUrl(paperData);
        const currentPath = window.location.pathname;
        if (newUrl !== currentPath) {
          navigate(newUrl, { replace: true });
          // Reset loading state after redirect
          setIsLoading(false);
          isLoadingRef.current = false;
          return;
        }
      }

      // Fetch rich metadata from multiple APIs for display (only if not already stored)
      let richMetadata = null;
      const needsRichData = !paperData.abstract;

      if (needsRichData) {
        setIsLoadingRichData(true);
        try {
          // Use the existing lookupPaperByDOI which already handles API calls and caching
          const freshPaperData = await dataClient.lookupPaperByDOI(paperData.doi);
          if (freshPaperData && freshPaperData.abstract) {
            richMetadata = {
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
              htmlUrl: freshPaperData.htmlUrl || undefined
            };
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
          htmlUrl: paperData.htmlUrl || undefined,
          sources: ['Database'] // Add sources property
        };
      }

      // Load aggregates data
      console.log('PaperPage: About to load aggregates for paperId:', paperId);
      const aggregatesData = await dataClient.getAggregatesForPaper(paperId);
      console.log('PaperPage: Aggregates loaded:', aggregatesData);

      setPaper(paperData);
      setRichMetadata(richMetadata);
      setAggregates(aggregatesData);

    } catch (error) {
      console.error('PaperPage: Error loading paper data', error);
      setNotFound(true);
      setIsLoading(false);
      isLoadingRef.current = false;
    } finally {
      // Ensure loading state is reset for the main success path
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  };

  const handlePaperUpdate = async () => {
    if (paper) {
      // Debounce the aggregates refresh to avoid excessive calls
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;
      
      try {
        const updatedAggregates = await dataClient.getAggregatesForPaper(paper.id);
        setAggregates(updatedAggregates);
      } finally {
        // Reset the loading flag after a short delay
        setTimeout(() => {
          isLoadingRef.current = false;
        }, 1000);
      }
    }
  };

  const handleRefreshMetadata = async () => {
    if (!paper) return;

    setIsRefreshing(true);
    try {
      // Use lookupPaperByDOI which handles caching and API calls properly
      const freshPaperData = await dataClient.lookupPaperByDOI(paper.doi);
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
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLookupLoading) {
    return (
      <div className="page-wrapper">
        <main className="page-container">
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
            <div className="flex items-center space-x-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Loading Paper Information</h2>
                <p className="text-muted-foreground">
                  Fetching paper details from academic databases...
                </p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground text-center max-w-md">
              This may take a few seconds as we retrieve comprehensive metadata from multiple sources including CrossRef, OpenAlex, and Semantic Scholar.
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
