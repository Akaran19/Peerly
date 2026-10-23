import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import { dataClient } from '@/lib/dataClient';
import { paperUrl } from '@/lib/routing';
import { getFurtherReading, PaperProfile, RelatedPaper } from '@/lib/enrichment';
import { toast } from '@/hooks/use-toast';

export default function RelatedPapers({ profile }: { profile: PaperProfile }) {
  const navigate = useNavigate();
  const [papers, setPapers] = useState<RelatedPaper[] | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPapers(null);
    getFurtherReading(profile).then(p => !cancelled && setPapers(p));
    return () => {
      cancelled = true;
    };
  }, [profile]);

  if (papers && !papers.length) return null;

  const open = async (p: RelatedPaper) => {
    if (!p.doi) {
      window.open(p.id, '_blank', 'noopener,noreferrer');
      return;
    }
    setOpeningId(p.id);
    try {
      const paper = await dataClient.lookupPaperByDOI(p.doi);
      if (paper) {
        navigate(paperUrl(paper), { state: { paper } });
        window.scrollTo({ top: 0 });
      } else {
        toast({ title: 'Could not open that paper yet', description: 'Please try again in a few seconds.' });
      }
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <section className="space-y-4" aria-labelledby="related-heading">
      <h2 id="related-heading" className="paper-section-label">Further reading</h2>

      {!papers ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-12 animate-pulse rounded-md bg-muted/60" />
          ))}
        </div>
      ) : (
        <ol className="divide-y">
          {papers.map((p, i) => (
            <li key={p.id}>
              <button
                onClick={() => open(p)}
                disabled={openingId !== null}
                className="group flex w-full items-baseline gap-4 py-3 text-left transition-colors disabled:cursor-wait"
              >
                <span className="w-5 shrink-0 font-ident text-[11px] text-muted-foreground">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-editorial text-[17px] leading-snug transition-colors group-hover:text-primary">
                    {p.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    <span
                      className={`mr-2 rounded px-1.5 py-px font-ident text-[9px] uppercase tracking-wider ${
                        p.reason === 'cites' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {p.reason === 'cites' ? 'Builds on this' : 'Related'}
                    </span>
                    {p.firstAuthor}
                    {p.authorCount > 1 && ' et al.'}
                    {p.year && ` · ${p.year}`}
                    {p.citationCount ? ` · ${p.citationCount.toLocaleString()} citations` : ''}
                  </span>
                </span>
                {openingId === p.id ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                ) : (
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                )}
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
