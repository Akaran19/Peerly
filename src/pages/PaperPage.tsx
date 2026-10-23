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
import { RefreshCw, Loader2 } from 'lucide-react';
import { DisplayPaperMetadata } from '@/lib/crossref';
import Header from '@/components/Header';
import { getTier } from '@/lib/account';
import { type Tier } from '@/lib/tier';
import { cleanAbstract, findOpenAccess, getPaperProfile, OpenAccessLink, PaperProfile } from '@/lib/enrichment';
import PaperStatusBanner from '@/components/PaperStatusBanner';
import PaperByline from '@/components/PaperByline';
import PaperAccess from '@/components/PaperAccess';
import PaperImpact from '@/components/PaperImpact';
import PaperVenue from '@/components/PaperVenue';
import RelatedPapers from '@/components/RelatedPapers';

// Staggered entrance for the title-page sections
const reveal = (step: number) => ({ '--reveal-delay': `${step * 70}ms` } as React.CSSProperties);

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
  const [tier, setTier] = useState<Tier>('free');
  const [openAccess, setOpenAccess] = useState<OpenAccessLink | null>(null);
  const [profile, setProfile] = useState<PaperProfile | null>(null);

  const paperDoi = paper?.doi;
  const storedPdfUrl = richMetadata?.pdfUrl;

  // Authors, affiliations, impact, venue and related works from a single free OpenAlex lookup
  useEffect(() => {
    setProfile(null);
    if (!paperDoi) return;
    let cancelled = false;
    getPaperProfile(paperDoi).then(p => {
      if (!cancelled) setProfile(p);
    });
    return () => {
      cancelled = true;
    };
  }, [paperDoi]);

  // Look for a free legal copy only when we don't already have a PDF link
  useEffect(() => {
    setOpenAccess(null);
    if (!paperDoi || storedPdfUrl) return;
    let cancelled = false;
    findOpenAccess(paperDoi).then(link => {
      if (!cancelled) setOpenAccess(link);
    });
    return () => {
      cancelled = true;
    };
  }, [paperDoi, storedPdfUrl]);

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

  useEffect(() => {
    const loadTier = async () => {
      try {
        const userTier = await getTier();
        setTier(userTier);
      } catch (error) {
        console.error('Error loading tier:', error);
      }
    };
    loadTier();
  }, []);

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

  const abstract = cleanAbstract(richMetadata?.abstract || paper.abstract);
  const venueName = richMetadata?.journal || richMetadata?.conference || paper.journal || paper.conference;
  const publishedLabel = richMetadata?.publishedDate
    ? new Date(richMetadata.publishedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : (richMetadata?.year || paper.year)?.toString();
  const typeLabel = (richMetadata?.type || paper.type)?.replace(/[-_]/g, ' ');
  const kicker = [typeLabel, venueName, publishedLabel].filter((part): part is string => !!part);

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
          <nav className="mb-8 flex items-center justify-between">
            <Link
              to="/"
              className="font-ident text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-primary"
            >
              ← Back to search
            </Link>
            <button
              onClick={handleRefreshMetadata}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
              title="Refresh metadata from multiple APIs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Refreshing…' : 'Refresh data'}</span>
            </button>
          </nav>

          {/* Mobile order: title page, library actions, article body, insights.
              On desktop the actions and insights share the right column. */}
          <div className="grid grid-cols-1 gap-x-14 lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-[auto_auto_1fr]">
            <header className="paper-masthead min-w-0 space-y-5 pb-10 lg:col-start-1 lg:row-start-1">
              <PaperStatusBanner doi={paper.doi} />

              <p className="paper-kicker paper-reveal flex flex-wrap items-center gap-x-2 gap-y-1" style={reveal(0)}>
                {kicker.map((part, i) => (
                  <span key={part} className="flex items-center gap-2">
                    {i > 0 && <span className="h-px w-4 bg-muted-foreground/40" aria-hidden />}
                    {part}
                  </span>
                ))}
              </p>

              <h1
                className="paper-reveal text-balance font-editorial text-[2rem] font-medium leading-[1.08] tracking-[-0.015em] sm:text-4xl md:text-[2.9rem]"
                style={reveal(1)}
              >
                {paper.title}
              </h1>

              <div className="paper-reveal" style={reveal(2)}>
                <PaperByline
                  authors={profile?.authors}
                  affiliations={profile?.affiliations}
                  fallbackNames={richMetadata?.authors || paper.authors || []}
                />
              </div>

              <div className="paper-reveal space-y-4" style={reveal(3)}>
                <div className="paper-rule" />
                <PaperAccess
                  doi={paper.doi}
                  oaStatus={profile?.oaStatus}
                  pdfUrl={richMetadata?.pdfUrl}
                  htmlUrl={richMetadata?.htmlUrl}
                  openAccess={openAccess}
                />
              </div>

              {isLoadingRichData && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading additional details…
                </p>
              )}
            </header>

            <div className="paper-reveal space-y-4 pb-10 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:pb-5" style={reveal(2)}>
              <section className="paper-panel space-y-3 [&_button]:min-h-0 [&_button]:min-w-0" aria-labelledby="readers-heading">
                <h2 id="readers-heading" className="paper-section-label">On Peerly</h2>
                {aggregates ? (
                  <AggregateStats aggregates={aggregates} />
                ) : (
                  <div className="h-5 w-32 animate-pulse rounded bg-muted" />
                )}
              </section>

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
                tier={tier}
                showDoiActions={false}
              />
            </div>

            <article className="min-w-0 space-y-8 pb-10 lg:col-start-1 lg:row-span-2 lg:row-start-2">
              {abstract && (
                <section className="paper-reveal space-y-4" style={reveal(4)} aria-labelledby="abstract-heading">
                  <h2 id="abstract-heading" className="paper-section-label">Abstract</h2>
                  <p className="paper-dropcap font-editorial text-[17px] leading-[1.75] text-foreground/85 md:text-[18.5px]">
                    {abstract}
                  </p>
                </section>
              )}

              {(profile?.topics.length || profile?.keywords.length) ? (
                <section className="paper-reveal space-y-3" style={reveal(5)} aria-labelledby="topics-heading">
                  <h2 id="topics-heading" className="paper-section-label">Topics</h2>
                  <div className="flex flex-wrap gap-2">
                    {profile.topics.map(t => (
                      <span key={t.name} className="rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-xs">
                        {t.field && <span className="text-muted-foreground">{t.field} › </span>}
                        <span className="font-medium text-foreground">{t.name}</span>
                      </span>
                    ))}
                    {profile.keywords.map(k => (
                      <span key={k} className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                        {k}
                      </span>
                    ))}
                  </div>
                </section>
              ) : null}

              <div className="paper-reveal" style={reveal(6)}>
                <ReviewsCard paperId={paper.id} limit={3} />
              </div>

              {profile && (profile.openAlexId || profile.relatedWorkIds.length > 0) && <RelatedPapers profile={profile} />}
            </article>

            <aside className="space-y-5 lg:col-start-2 lg:row-start-3">
              <div className="paper-reveal" style={reveal(3)}>
                <PaperImpact profile={profile} fallbackCount={richMetadata?.citationCount ?? paper.citationCount} />
              </div>

              <div className="paper-reveal" style={reveal(4)}>
                <PaperVenue
                  venue={profile?.venue}
                  fallbackName={richMetadata?.journal || richMetadata?.conference || paper.journal || paper.conference}
                  fallbackPublisher={richMetadata?.publisher || paper.publisher}
                  type={richMetadata?.type || paper.type}
                />
              </div>
            </aside>
          </div>
        </main>
      </div>
    </>
  );
}
