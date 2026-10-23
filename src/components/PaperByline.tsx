import { useState } from 'react';
import { Mail } from 'lucide-react';
import { ProfileAffiliation, ProfileAuthor } from '@/lib/enrichment';

const COLLAPSED_AUTHOR_COUNT = 12;

const scholarUrl = (name: string) => `https://scholar.google.com/scholar?q=author:${encodeURIComponent(`"${name}"`)}`;

function OrcidMark({ orcid, name }: { orcid: string; name: string }) {
  return (
    <a
      href={orcid}
      target="_blank"
      rel="noopener noreferrer"
      title={`${name} on ORCID`}
      aria-label={`${name}'s ORCID profile`}
      className="ml-0.5 inline-flex h-[13px] w-[13px] translate-y-[-1px] items-center justify-center rounded-full bg-[#A6CE39] align-middle font-sans text-[7px] font-bold leading-none text-white transition-transform hover:scale-125"
    >
      iD
    </a>
  );
}

interface PaperBylineProps {
  // Rich author data from OpenAlex; falls back to plain names from our database
  authors?: ProfileAuthor[];
  affiliations?: ProfileAffiliation[];
  fallbackNames?: string[];
}

export default function PaperByline({ authors, affiliations = [], fallbackNames = [] }: PaperBylineProps) {
  const [expanded, setExpanded] = useState(false);

  const list: ProfileAuthor[] = authors?.length
    ? authors
    : fallbackNames.map(name => ({ name, affiliationIndexes: [] }));

  if (!list.length) return null;

  const visible = expanded ? list : list.slice(0, COLLAPSED_AUTHOR_COUNT);
  const hidden = list.length - visible.length;
  // Only show affiliations referenced by visible authors
  const visibleAffIdx = new Set(visible.flatMap(a => a.affiliationIndexes));
  const showAffiliations = affiliations.length > 0;

  return (
    <div className="space-y-3">
      <p className="font-editorial text-[17px] leading-relaxed text-foreground/90 md:text-lg">
        {visible.map((author, i) => (
          <span key={`${author.name}-${i}`} className="whitespace-nowrap">
            <a
              href={scholarUrl(author.name)}
              target="_blank"
              rel="noopener noreferrer"
              title={`Search ${author.name} on Google Scholar`}
              className="decoration-primary/40 underline-offset-[3px] transition-colors hover:text-primary hover:underline"
            >
              {author.name}
            </a>
            {author.affiliationIndexes.length > 0 && (
              <sup className="ml-px font-ident text-[9px] text-muted-foreground">{author.affiliationIndexes.join(',')}</sup>
            )}
            {author.isCorresponding && (
              <Mail className="ml-0.5 inline h-3 w-3 -translate-y-px text-muted-foreground" aria-label="Corresponding author" />
            )}
            {author.orcid && <OrcidMark orcid={author.orcid} name={author.name} />}
            {i < visible.length - 1 && <span className="text-muted-foreground">, </span>}
          </span>
        ))}
        {hidden > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="ml-2 inline min-h-0 min-w-0 font-ident text-[11px] uppercase tracking-wider text-primary hover:underline"
          >
            +{hidden} more
          </button>
        )}
      </p>

      {showAffiliations && (
        <ol className="space-y-0.5 text-[13px] text-muted-foreground">
          {affiliations.map((aff, i) =>
            visibleAffIdx.has(i + 1) ? (
              <li key={aff.ror || aff.name} className="flex gap-2">
                <span className="w-4 shrink-0 text-right font-ident text-[10px] leading-5">{i + 1}</span>
                {aff.ror ? (
                  <a
                    href={aff.ror}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Institution record on ROR"
                    className="transition-colors hover:text-foreground hover:underline"
                  >
                    {aff.name}
                  </a>
                ) : (
                  <span>{aff.name}</span>
                )}
                {aff.countryCode && <span className="font-ident text-[10px] leading-5 opacity-60">{aff.countryCode}</span>}
              </li>
            ) : null
          )}
        </ol>
      )}
    </div>
  );
}
