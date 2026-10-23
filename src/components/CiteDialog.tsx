import { useEffect, useState } from 'react';
import { Copy, Download, Loader2, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { CITATION_FORMATS, CitationFormat, getCitation } from '@/lib/enrichment';

const FORMAT_KEYS = Object.keys(CITATION_FORMATS) as CitationFormat[];

export default function CiteDialog({ doi }: { doi: string }) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<CitationFormat>('apa');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getCitation(doi, format)
      .then(t => !cancelled && setText(t))
      .catch(() => !cancelled && setError('Could not load this citation format for this DOI.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, doi, format]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Citation copied' });
    } catch {
      toast({ title: 'Could not copy citation', variant: 'destructive' });
    }
  };

  const handleDownload = () => {
    const ext = CITATION_FORMATS[format].fileExt;
    if (!ext) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doi.replace(/[^a-z0-9]+/gi, '_')}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isFile = !!CITATION_FORMATS[format].fileExt;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-sm font-medium transition-all hover:-translate-y-px hover:border-primary/50 hover:text-primary hover:shadow-sm">
          <Quote className="w-4 h-4" />
          Cite
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-editorial text-2xl font-medium">Cite this paper</DialogTitle>
          <DialogDescription>Generated from the DOI registry. Check it before submitting.</DialogDescription>
        </DialogHeader>

        <Tabs value={format} onValueChange={v => setFormat(v as CitationFormat)}>
          <TabsList className="flex flex-wrap h-auto">
            {FORMAT_KEYS.map(key => (
              <TabsTrigger key={key} value={key}>
                {CITATION_FORMATS[key].label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="min-h-[96px] rounded-md border bg-muted/40 p-3 text-sm">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading…
            </div>
          ) : error ? (
            <p className="text-destructive">{error}</p>
          ) : (
            <pre className={`whitespace-pre-wrap break-words ${isFile ? 'font-ident text-[11px] leading-relaxed' : 'font-editorial text-[15px] leading-relaxed'}`}>{text}</pre>
          )}
        </div>

        <div className="flex justify-end gap-2">
          {isFile && (
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={loading || !!error || !text}>
              <Download className="w-4 h-4 mr-2" />
              Download .{CITATION_FORMATS[format].fileExt}
            </Button>
          )}
          <Button size="sm" onClick={handleCopy} disabled={loading || !!error || !text}>
            <Copy className="w-4 h-4 mr-2" />
            Copy
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
