import { PaperProfile } from '@/lib/enrichment';

const YEARS_SHOWN = 10;

function percentileLabel(p: NonNullable<PaperProfile['percentile']>): string {
  if (p.top1) return 'Top 1%';
  if (p.top10) return 'Top 10%';
  return `${Math.round(p.value * 100)}th pct`;
}

export default function PaperImpact({ profile, fallbackCount }: { profile: PaperProfile | null; fallbackCount?: number }) {
  const total = profile?.citationCount ?? fallbackCount;
  if (total === undefined && !profile) return null;

  // Fill gaps so the chart reads as a continuous timeline
  const byYear = new Map((profile?.citationsByYear || []).map(c => [c.year, c.count]));
  const years = [...byYear.keys()];
  const lastYear = years.length ? Math.max(...years) : undefined;
  const series = lastYear
    ? Array.from({ length: YEARS_SHOWN }, (_, i) => {
        const year = lastYear - YEARS_SHOWN + 1 + i;
        return { year, count: byYear.get(year) ?? 0 };
      })
    : [];
  const peak = Math.max(1, ...series.map(s => s.count));
  const hasChart = series.some(s => s.count > 0);

  return (
    <section className="paper-panel space-y-4" aria-labelledby="impact-heading">
      <h2 id="impact-heading" className="paper-section-label">Impact</h2>

      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="font-editorial text-4xl font-semibold leading-none tabular-nums">
            {(total ?? 0).toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">citations</div>
        </div>
        {profile?.percentile && (
          <div
            className="rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-right"
            title="Citation percentile among papers of the same field, type and year (OpenAlex)"
          >
            <div className="font-ident text-[11px] font-medium text-primary">{percentileLabel(profile.percentile)}</div>
            <div className="text-[10px] text-muted-foreground">in its field</div>
          </div>
        )}
      </div>

      {hasChart && (
        <figure>
          <div
            className="flex h-16 items-end gap-[3px]"
            role="img"
            aria-label={`Citations per year: ${series.map(s => `${s.year}: ${s.count}`).join(', ')}`}
          >
            {series.map((s, i) => (
              <div
                key={s.year}
                title={`${s.year}: ${s.count} citation${s.count === 1 ? '' : 's'}`}
                className="paper-bar flex-1 rounded-t-[2px] bg-primary/70 transition-colors hover:bg-primary"
                style={{
                  height: `${Math.max(4, (s.count / peak) * 100)}%`,
                  opacity: s.count ? 1 : 0.25,
                  animationDelay: `${300 + i * 40}ms`,
                }}
              />
            ))}
          </div>
          <figcaption className="mt-1.5 flex justify-between font-ident text-[9.5px] text-muted-foreground">
            <span>{series[0].year}</span>
            <span>citations / year</span>
            <span>{series[series.length - 1].year}</span>
          </figcaption>
        </figure>
      )}

      {profile?.fwci !== undefined && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Cited{' '}
          <span className="font-medium text-foreground">{profile.fwci >= 10 ? profile.fwci.toFixed(0) : profile.fwci.toFixed(1)}×</span>{' '}
          the average for similar papers{' '}
          <span className="opacity-70">(field-weighted citation impact)</span>.
        </p>
      )}

      <p className="font-ident text-[9.5px] text-muted-foreground/70">
        Data:{' '}
        <a href="https://openalex.org" target="_blank" rel="noopener noreferrer" className="hover:underline">
          OpenAlex
        </a>
      </p>
    </section>
  );
}
