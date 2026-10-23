import { BadgeCheck } from 'lucide-react';
import { PaperProfile } from '@/lib/enrichment';

interface PaperVenueProps {
  venue?: PaperProfile['venue'];
  fallbackName?: string;
  fallbackPublisher?: string;
  type?: string;
}

export default function PaperVenue({ venue, fallbackName, fallbackPublisher, type }: PaperVenueProps) {
  const name = venue?.name || fallbackName;
  const publisher = venue?.publisher || fallbackPublisher;
  if (!name && !publisher) return null;

  return (
    <section className="paper-panel space-y-3" aria-labelledby="venue-heading">
      <h2 id="venue-heading" className="paper-section-label">Published in</h2>

      <div>
        {name && <p className="font-editorial text-xl font-medium italic leading-snug">{name}</p>}
        {publisher && publisher !== name && <p className="mt-0.5 text-sm text-muted-foreground">{publisher}</p>}
      </div>

      <dl className="space-y-1.5 text-xs">
        {type && (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Type</dt>
            <dd className="capitalize">{type.replace(/[-_]/g, ' ')}</dd>
          </div>
        )}
        {venue?.apcUsd !== undefined && (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground" title="Article processing charge paid by authors">Author fee (APC)</dt>
            <dd className="tabular-nums">${venue.apcUsd.toLocaleString()}</dd>
          </div>
        )}
      </dl>

      {venue?.inDoaj && (
        <p
          className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400"
          title="Listed in the Directory of Open Access Journals, which vets journals for peer review and publishing standards"
        >
          <BadgeCheck className="h-3.5 w-3.5" />
          Listed in DOAJ
        </p>
      )}
    </section>
  );
}
