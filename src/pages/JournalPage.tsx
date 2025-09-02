import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Journal, Paper } from '@/types';
import { dataClient } from '@/lib/dataClient';
import { PaperCard } from '@/components/PaperCard';
import { BookOpen, ExternalLink, Hash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header';

export default function JournalPage() {
  const params = useParams();
  const journalId = params.id as string;
  
  const [journal, setJournal] = useState<Journal | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    loadJournalData();
  }, [journalId]);

  const loadJournalData = async () => {
    try {
      const [journalData, papersData] = await Promise.all([
        dataClient.getJournal(journalId),
        dataClient.listPapersByJournal(journalId)
      ]);

      if (!journalData) {
        setNotFound(true);
        return;
      }

      setJournal(journalData);
      setPapers(papersData);
    } catch (error) {
      console.error('Error loading journal:', error);
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-wrapper">
        <Header />
        <main className="page-container">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-muted rounded w-1/2"></div>
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="academic-card p-6 animate-pulse">
                  <div className="space-y-4">
                    <div className="h-6 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (notFound || !journal) {
    return (
      <div className="page-wrapper">
        <Header />
        <main className="page-container">
          <div className="text-center py-12">
            <h1 className="text-4xl font-bold mb-4">Journal Not Found</h1>
            <p className="text-muted-foreground mb-8">
              The journal you're looking for doesn't exist in our database.
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

        <div className="space-y-8">
          {/* Journal Header */}
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold">
                  {journal.name}
                </h1>
                <div className="flex flex-wrap items-center gap-4 mt-2">
                  {journal.issn && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Hash className="w-4 h-4" />
                      <span>ISSN {journal.issn}</span>
                    </div>
                  )}
                  {journal.externalId && (
                    <a
                      href="#" // Would link to journal homepage in real app
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Journal Homepage
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Badge variant="secondary">
                <BookOpen className="w-3 h-3 mr-1" />
                {papers.length} {papers.length === 1 ? 'Paper' : 'Papers'}
              </Badge>
            </div>
          </div>

          {/* Papers Section */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Recent Publications</h2>
            
            {papers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-muted-foreground">
                  <p className="text-lg mb-2">No papers found</p>
                  <p className="text-sm">This journal doesn't have any papers in our database yet.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {papers
                  .sort((a, b) => (b.year || 0) - (a.year || 0))
                  .map((paper) => (
                  <PaperCard
                    key={paper.id}
                    paper={paper}
                    showAbstract
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}