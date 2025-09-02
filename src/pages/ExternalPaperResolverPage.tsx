import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, AlertCircle, ExternalLink, Users, Calendar, BookOpen, TrendingUp, FileText, Globe } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';

interface ExternalPaper {
  doi?: string;
  title: string;
  authors: string[];
  journal?: string;
  conference?: string;
  year?: number;
  publishedDate?: string;
  abstract?: string;
  citationCount?: number;
  referencesCount?: number;
  publisher?: string;
  type?: string;
  pdfUrl?: string;
  htmlUrl?: string;
  source: string;
  externalUrl: string;
}

export default function ExternalPaperResolverPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const source = params.source as string;
  const id = params.id as string;
  const [paper, setPaper] = useState<ExternalPaper | null>(null);
  const [status, setStatus] = useState<string>('Loading paper...');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        // User not authenticated, redirect to sign in
        setError('You must be signed in to view papers.');
        setTimeout(() => {
          navigate('/signin', { replace: true });
        }, 3000);
        return;
      }
      fetchExternalPaper();
    }
  }, [source, id, user, authLoading]);

  const fetchExternalPaper = async () => {
    try {
      setError(null);
      setStatus('Fetching paper from external source...');

      let externalPaper: ExternalPaper | null = null;

      if (source === 'openalex') {
        externalPaper = await fetchFromOpenAlex(id);
      } else if (source === 'crossref') {
        externalPaper = await fetchFromCrossref(id);
      } else {
        // Generic external source
        externalPaper = {
          title: 'External Paper',
          authors: [],
          source: source,
          externalUrl: `https://${source}.org/${id}`
        };
      }

      if (externalPaper) {
        setPaper(externalPaper);
        setIsLoading(false);
      } else {
        setError('Could not fetch paper information from external source.');
        setIsLoading(false);
      }

    } catch (error) {
      console.error('Error fetching external paper:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const fetchFromOpenAlex = async (openAlexId: string): Promise<ExternalPaper | null> => {
    try {
      const response = await fetch(`https://api.openalex.org/works/${openAlexId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch from OpenAlex');
      }
      const data = await response.json();

      return {
        doi: data.doi ? data.doi.replace('https://doi.org/', '') : undefined,
        title: data.title || data.display_name || 'Untitled',
        authors: (data.authorships || []).map((a: any) => a.author?.display_name).filter(Boolean),
        journal: data.primary_location?.source?.display_name,
        year: data.publication_year,
        publishedDate: data.publication_date,
        abstract: data.abstract_inverted_index ? reconstructAbstract(data.abstract_inverted_index) : undefined,
        citationCount: data.cited_by_count,
        referencesCount: data.referenced_works?.length,
        publisher: data.primary_location?.source?.publisher,
        type: data.type,
        pdfUrl: data.open_access?.oa_url,
        htmlUrl: data.primary_location?.landing_page_url,
        source: 'openalex',
        externalUrl: data.id || `https://openalex.org/${openAlexId}`
      };
    } catch (error) {
      console.error('Error fetching from OpenAlex:', error);
      return null;
    }
  };

  const fetchFromCrossref = async (doi: string): Promise<ExternalPaper | null> => {
    try {
      const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch from Crossref');
      }
      const data = await response.json();
      const work = data.message;

      return {
        doi: work.DOI,
        title: Array.isArray(work.title) ? work.title[0] : work.title,
        authors: (work.author || []).map((a: any) => [a.given, a.family].filter(Boolean).join(' ')),
        journal: work['container-title']?.[0],
        year: work.issued?.['date-parts']?.[0]?.[0],
        publishedDate: work.issued ? `${work.issued['date-parts'][0].join('-')}` : undefined,
        abstract: work.abstract,
        citationCount: work['is-referenced-by-count'],
        referencesCount: work['reference-count'],
        publisher: work.publisher,
        type: work.type,
        pdfUrl: work.link?.find((l: any) => l['content-type'] === 'application/pdf')?.URL,
        htmlUrl: work.link?.find((l: any) => l['content-type'] === 'text/html')?.URL,
        source: 'crossref',
        externalUrl: work.URL || `https://doi.org/${doi}`
      };
    } catch (error) {
      console.error('Error fetching from Crossref:', error);
      return null;
    }
  };

  const reconstructAbstract = (invertedIndex: any): string => {
    if (!invertedIndex) return '';
    const words: string[] = [];
    Object.entries(invertedIndex).forEach(([word, positions]: [string, any]) => {
      positions.forEach((pos: number) => {
        words[pos] = word;
      });
    });
    return words.join(' ');
  };

  // Helper function to generate Google Scholar URL for author search
  const getGoogleScholarUrl = (authorName: string): string => {
    const encodedAuthor = encodeURIComponent(`"${authorName}"`);
    return `https://scholar.google.com/scholar?q=author:${encodedAuthor}`;
  };

  // Show loading while checking authentication
  if (authLoading || isLoading) {
    return (
      <div className="page-wrapper">
        <Header />
        <main className="page-container">
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold">Loading Paper</h1>
              <p className="text-muted-foreground max-w-md">
                {status}
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !paper) {
    return (
      <div className="page-wrapper">
        <Header />
        <main className="page-container">
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
            <Alert variant="destructive" className="max-w-md">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="space-y-4">
                <p>{error || 'Paper not found'}</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/')}
                    className="flex-1"
                  >
                    Search Again
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.history.back()}
                    className="flex-1"
                  >
                    Go Back
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
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

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Title and Metadata */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                {paper.title}
              </h1>
              <Badge variant="outline" className="text-xs">
                External Paper
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {/* Authors */}
              {paper.authors && paper.authors.length > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <div className="flex flex-wrap gap-1">
                    {paper.authors.map((author, index) => (
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
                        {index < paper.authors.length - 1 && <span className="text-muted-foreground">, </span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Publication Date */}
              {paper.publishedDate ? (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(paper.publishedDate).toLocaleDateString('en-US', {
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
              {paper.referencesCount && (
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>{paper.referencesCount} references</span>
                </div>
              )}

              {/* Citation Count */}
              {paper.citationCount && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>{paper.citationCount} citations</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* Journal or Conference */}
              {(paper.journal || paper.conference) && (
                <Badge variant="secondary" className="hover:bg-primary/10 transition-colors">
                  {paper.journal || paper.conference}
                </Badge>
              )}

              {/* Publisher */}
              {paper.publisher && (
                <Badge variant="outline">
                  {paper.publisher}
                </Badge>
              )}

              {/* Publication Type */}
              {paper.type && (
                <Badge variant="outline">
                  {paper.type.replace('-', ' ')}
                </Badge>
              )}

              {/* DOI Link */}
              {paper.doi && (
                <a
                  href={`https://doi.org/${paper.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  DOI: {paper.doi}
                </a>
              )}

              {/* PDF Link */}
              {paper.pdfUrl && (
                <a
                  href={paper.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                >
                  <FileText className="w-4 h-4" />
                  PDF
                </a>
              )}

              {/* HTML Link */}
              {paper.htmlUrl && (
                <a
                  href={paper.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-green-600 hover:underline"
                >
                  <Globe className="w-4 h-4" />
                  View Online
                </a>
              )}

              {/* External Source Link */}
              <a
                href={paper.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-purple-600 hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                View on {paper.source === 'openalex' ? 'OpenAlex' : paper.source === 'crossref' ? 'Crossref' : paper.source}
              </a>
            </div>
          </div>

          {/* Abstract */}
          {paper.abstract && (
            <div className="academic-card p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Abstract
              </h2>
              <p className="text-base-academic md:text-base-academic-md leading-relaxed text-muted-foreground">
                {paper.abstract}
              </p>
            </div>
          )}

          {/* Note about external paper */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This paper is not in our database yet. You can view it using the links above, or{' '}
              <Link to="/" className="text-primary hover:underline">
                search for it
              </Link>{' '}
              to see if it's available in our collection.
            </AlertDescription>
          </Alert>
        </div>
      </main>
    </div>
  );
}
