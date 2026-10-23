import { useEffect, useState } from 'react';
import { AlertTriangle, FilePen } from 'lucide-react';
import { getPaperStatus, PaperStatus, PaperUpdate, PaperUpdateType } from '@/lib/enrichment';
import { formatDOIUrl } from '@/lib/doi';

const LABELS: Record<PaperUpdateType, string> = {
  retraction: 'Retraction',
  withdrawal: 'Withdrawal',
  removal: 'Removal',
  expression_of_concern: 'Expression of concern',
  correction: 'Correction',
  other: 'Update',
};

function NoticeList({ updates }: { updates: PaperUpdate[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1">
      {updates.map((u, i) => (
        <li key={`${u.type}-${u.noticeDoi ?? i}`} className="font-ident text-[10.5px] uppercase tracking-wider">
          {u.noticeDoi ? (
            <a href={formatDOIUrl(u.noticeDoi)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:no-underline">
              {LABELS[u.type]}
              {u.date && ` · ${u.date}`}
            </a>
          ) : (
            <>
              {LABELS[u.type]}
              {u.date && ` · ${u.date}`}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function PaperStatusBanner({ doi }: { doi: string }) {
  const [status, setStatus] = useState<PaperStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus(null);
    getPaperStatus(doi).then(s => {
      if (!cancelled) setStatus(s);
    });
    return () => {
      cancelled = true;
    };
  }, [doi]);

  if (!status) return null;

  const serious = status.updates.filter(u => u.type !== 'correction' && u.type !== 'other');
  const minor = status.updates.filter(u => u.type === 'correction');

  if (status.isRetracted || serious.length > 0) {
    const title = status.isRetracted ? 'Retracted' : 'Expression of concern';
    const body = status.isRetracted
      ? 'This paper has been retracted. Its findings should not be relied on.'
      : 'The publisher has raised concerns about this paper. Read it with care.';
    return (
      <div role="alert" className="paper-reveal paper-hazard overflow-hidden rounded-lg border-2 border-destructive/60">
        <div className="flex items-start gap-3 bg-background/85 px-4 py-3 backdrop-blur-[1px] sm:m-1.5 sm:rounded-md">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="space-y-1">
            <p className="font-ident text-xs font-medium uppercase tracking-[0.2em] text-destructive">{title}</p>
            <p className="text-sm text-foreground/90">{body}</p>
            {serious.length > 0 && <NoticeList updates={serious} />}
          </div>
        </div>
      </div>
    );
  }

  if (minor.length > 0) {
    return (
      <div className="paper-reveal flex items-start gap-3 rounded-lg border border-amber-300/70 bg-amber-50/70 px-4 py-2.5 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        <FilePen className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-0.5">
          <p className="text-sm">This paper has {minor.length === 1 ? 'a published correction' : 'published corrections'}.</p>
          <NoticeList updates={minor} />
        </div>
      </div>
    );
  }

  return null;
}
