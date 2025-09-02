import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Author, Paper } from '@/types';
import { dataClient } from '@/lib/dataClient';
import { PaperCard } from '@/components/PaperCard';
import { User, BookOpen, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header';

export default function AuthorPage() {
  const params = useParams();
  const authorId = params.id as string;
  
  const [author, setAuthor] = useState<Author | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    loadAuthorData();
  }, [authorId]);

  const loadAuthorData = async () => {
    try {
      const [authorData, papersData] = await Promise.all([
        dataClient.getAuthor(authorId),
        dataClient.listPapersByAuthor(authorId)
      ]);

      if (!authorData) {
        setNotFound(true);
        return;
      }

      setAuthor(authorData);
      setPapers(papersData);
    } catch (error) {
      console.error('Error loading author:', error);
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

  if (notFound || !author) {
    return (
      <div className="page-wrapper">
        <Header />
        <main className="page-container">
          <div className="text-center py-12">
            <h1 className="text-4xl font-bold mb-4">Author Not Found</h1>
            <p className="text-muted-foreground mb-8">
              The author you're looking for doesn't exist in our database.
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
          {/* Author Header */}
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold">
                  {author.name}
                </h1>
                {author.externalId && (
                  <a
                    href={`https://orcid.org/${author.externalId.replace('orcid:', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    ORCID Profile
                  </a>
                )}
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
            <h2 className="text-2xl font-semibold">Published Papers</h2>
            
            {papers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-muted-foreground">
                  <p className="text-lg mb-2">No papers found</p>
                  <p className="text-sm">This author doesn't have any papers in our database yet.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {papers.map((paper) => (
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