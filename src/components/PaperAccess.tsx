import { useState } from 'react';
import { Check, Copy, FileText, Globe, Lock, LockOpen } from 'lucide-react';
import CiteDialog from '@/components/CiteDialog';
import { formatDOIUrl } from '@/lib/doi';
import { OAStatus, OpenAccessLink } from '@/lib/enrichment';

const OA_STATUS: Record<OAStatus, { label: string; hint: string; className: string }> = {
  diamond: {
    label: 'Diamond OA',
    hint: 'Free to read and free to publish: no fees for readers or authors',
    className: 'border-cyan-300 bg-cyan-50 text-cyan-800 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-200',
  },
  gold: {
    label: 'Gold OA',
    hint: 'Published in a fully open-access journal',
    className: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200',
  },
  hybrid: {
    label: 'Hybrid OA',
    hint: 'Open article in a subscription journal',
    className: 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200',
  },
  green: {
    label: 'Green OA',
    hint: 'A free copy is available in a repository',
    className: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  },
  bronze: {
    label: 'Bronze OA',
    hint: 'Free to read on the publisher site, without an open licence',
    className: 'border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200',
  },
  closed: {
    label: 'Paywalled',
    hint: 'No free legal copy found',
    className: 'border-border bg-muted text-muted-foreground',
  },
};

function OAStatusBadge({ status }: { status: OAStatus }) {
  const s = OA_STATUS[status];
  if (!s) return null;
  const Icon = status === 'closed' ? Lock : LockOpen;
  return (
    <span
      title={s.hint}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-ident text-[10.5px] font-medium uppercase tracking-wider ${s.className}`}
    >
      <Icon className="h-3 w-3" />
      {s.label}
    </span>
  );
}

const linkClass =
  'inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-sm font-medium transition-all hover:-translate-y-px hover:border-primary/50 hover:text-primary hover:shadow-sm';

interface PaperAccessProps {
  doi: string;
  oaStatus?: OAStatus;
  pdfUrl?: string;
  htmlUrl?: string;
  openAccess?: OpenAccessLink | null;
}

export default function PaperAccess({ doi, oaStatus, pdfUrl, htmlUrl, openAccess }: PaperAccessProps) {
  const [copied, setCopied] = useState(false);

  const copyDoi = async () => {
    try {
      await navigator.clipboard.writeText(formatDOIUrl(doi));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; the DOI is still visible and selectable
    }
  };

  // Prefer a stored PDF, then a free copy we found, then the publisher HTML
  const freeCopy = !pdfUrl && openAccess ? openAccess : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {oaStatus && <OAStatusBadge status={oaStatus} />}

      {pdfUrl && (
        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
          <FileText className="h-4 w-4" />
          PDF
        </a>
      )}

      {freeCopy && (
        <a
          href={freeCopy.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${linkClass} border-emerald-300 text-emerald-700 hover:border-emerald-500 hover:text-emerald-800 dark:border-emerald-800 dark:text-emerald-300`}
          title={`Legal open-access copy via ${freeCopy.source}${freeCopy.license ? ` · ${freeCopy.license}` : ''}`}
        >
          <FileText className="h-4 w-4" />
          {freeCopy.isPdf ? 'Free PDF' : 'Read free'}
        </a>
      )}

      {htmlUrl && (
        <a href={htmlUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
          <Globe className="h-4 w-4" />
          Publisher
        </a>
      )}

      <CiteDialog doi={doi} />

      <span className="inline-flex items-stretch overflow-hidden rounded-md border text-xs">
        <a
          href={formatDOIUrl(doi)}
          target="_blank"
          rel="noopener noreferrer"
          className="max-w-[220px] truncate px-2.5 py-1.5 font-ident text-[11px] text-muted-foreground transition-colors hover:text-primary sm:max-w-[320px]"
          title="Open DOI"
        >
          doi:{doi}
        </a>
        <button
          onClick={copyDoi}
          className="min-h-0 min-w-0 border-l px-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Copy DOI link"
          title="Copy DOI link"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </span>
    </div>
  );
}
