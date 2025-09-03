import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GraduationCap, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Header from '@/components/Header';

interface PubMedRecord {
  uid: string;
  title?: string;
  authors?: string[];
  source?: string;
  pubdate?: string;
  doi?: string;
}

export default function PMIDResolverPage() {
  const { pmid } = useParams<{ pmid: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<PubMedRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pmid) {
      setError('Invalid PMID');
      setLoading(false);
      return;
    }

    const fetchPubMedSummary = async () => {
      try {
        const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${pmid}&tool=peerly&email=akaran1909@gmail.com`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`PubMed API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        const rec = data?.result?.[pmid];

        if (!rec) {
          throw new Error('PubMed record not found - the ID may be invalid or the record may not exist');
        }

        setRecord(rec);

        // Check for DOI and redirect if found
        const elocationid = rec?.elocationid || rec?.doi || '';

        // Extract DOI from complex elocationid strings like "pii: ehaf673. doi: 10.1093/eurheartj/ehaf673"
        let doi = '';

        if (elocationid) {
          // Look for DOI pattern (starts with 10.)
          const doiMatch = elocationid.match(/10\.\d{4,}[^\s]*/);
          if (doiMatch) {
            doi = doiMatch[0];
          } else {
            // Fallback to the original string if no DOI pattern found
            doi = elocationid.toLowerCase()
              .replace(/^https?:\/\/doi\.org\//, '') // Remove https://doi.org/ prefix
              .replace(/^doi:\s*/, ''); // Remove "doi: " prefix
          }
        }

        if (doi) {
          navigate(`/paper/doi/${encodeURIComponent(doi)}`);
          return;
        }
      } catch (err) {
        console.error('Error fetching PubMed record:', err);
        setError(err instanceof Error ? err.message : 'Failed to load PubMed record');
      } finally {
        setLoading(false);
      }
    };

    fetchPubMedSummary();
  }, [pmid, navigate]);

  if (loading) {
    return (
      <div className="page-wrapper">
        <Header />
        <main className="page-container">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrapper">
        <Header />
        <main className="page-container">
          <div className="max-w-2xl mx-auto py-12">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          </div>
        </main>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="page-wrapper">
        <Header />
        <main className="page-container">
          <div className="max-w-2xl mx-auto py-12">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                PubMed record not found
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
        <div className="max-w-4xl mx-auto py-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">PubMed Record</h1>
              <p className="text-muted-foreground">PMID: {record.uid}</p>
            </div>
          </div>

          <Card className="p-6 space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">{record.title || 'Title unavailable'}</h2>

              {record.authors && record.authors.length > 0 && (
                <p className="text-muted-foreground mb-2">
                  {record.authors.join(', ')}
                </p>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {record.source && <span>{record.source}</span>}
                {record.pubdate && <span>{record.pubdate}</span>}
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button
                asChild
                className="gap-2"
              >
                <a
                  href={`https://pubmed.ncbi.nlm.nih.gov/${record.uid}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open on PubMed
                </a>
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
