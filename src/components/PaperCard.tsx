import { Link } from 'react-router-dom';
import { Paper, PaperAggregates } from '@/types';
import { paperUrl } from '@/lib/routing';
import { formatDOIUrl } from '@/lib/doi';
import { ExternalLink, Users, Calendar, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RatingStars } from '@/components/RatingStars';

interface PaperCardProps {
  paper: Paper;
  showAbstract?: boolean;
  aggregates?: PaperAggregates;
}

export function PaperCard({ paper, showAbstract = false, aggregates }: PaperCardProps) {
  // Helper function to generate Google Scholar URL for author search
  const getGoogleScholarUrl = (authorName: string): string => {
    const encodedAuthor = encodeURIComponent(`"${authorName}"`);
    return `https://scholar.google.com/scholar?q=author:${encodedAuthor}`;
  };
  return (
    <div className="academic-card p-6 space-y-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <Link 
            to={paperUrl(paper)}
            className="flex-1 group"
          >
            <h3 className="text-lg md:text-xl font-semibold leading-tight group-hover:text-primary transition-colors">
              {paper.title}
            </h3>
          </Link>
          <a
            href={formatDOIUrl(paper.doi)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 p-2 text-muted-foreground hover:text-primary transition-colors"
            aria-label={`View paper at ${paper.doi}`}
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {paper.authors && paper.authors.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <a
                href={getGoogleScholarUrl(paper.authors[0])}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors underline decoration-transparent hover:decoration-current"
                title={`Search for ${paper.authors[0]}'s publications on Google Scholar`}
              >
                {paper.authors.slice(0, 3).join(', ')}
                {paper.authors.length > 3 && ` +${paper.authors.length - 3} more`}
              </a>
            </div>
          )}
          
          {paper.publishedDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>{new Date(paper.publishedDate).getFullYear()}</span>
            </div>
          )}

          {paper.referencesCount && (
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              <span>{paper.referencesCount} refs</span>
            </div>
          )}
        </div>

        {(paper.journal || paper.conference) && (
          <div>
            <Badge variant="secondary" className="text-xs">
              {paper.journal || paper.conference}
            </Badge>
          </div>
        )}

        {/* Rating Display */}
        {aggregates && aggregates.count > 0 && (
          <div className="flex items-center gap-2">
            <RatingStars 
              rating={aggregates.avgRating} 
              readonly 
              size="sm" 
              showValue
            />
            <span className="text-xs text-muted-foreground">
              ({aggregates.count} {aggregates.count === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        )}

        {showAbstract && paper.abstract && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {paper.abstract}
          </p>
        )}
      </div>

      <div className="pt-2 border-t">
        <Link 
          to={paperUrl(paper)}
          className="text-sm font-medium text-primary hover:underline"
        >
          View details →
        </Link>
      </div>
    </div>
  );
}