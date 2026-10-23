import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

const SOURCES = ['OpenAlex', 'Crossref', 'Semantic Scholar', 'PubMed', 'Unpaywall', 'Europe PMC'];

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-foreground/80">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.4fr_1fr_1fr] md:px-6">
        <div className="space-y-3">
          <Link to="/" className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-brand" />
            <span className="font-editorial text-xl font-semibold tracking-[-0.02em]">Peerly</span>
          </Link>
          <p className="max-w-xs font-editorial text-[15px] italic leading-relaxed text-muted-foreground">
            Keep track of what you read, and see what your peers thought of it.
          </p>
        </div>

        <div className="space-y-3">
          <p className="label-mono">Colophon</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Paper metadata from {SOURCES.join(', ')}. Set in Newsreader, Schibsted Grotesk and Martian Mono.
          </p>
        </div>

        <nav className="space-y-3" aria-label="Footer">
          <p className="label-mono">Site</p>
          <ul className="space-y-1.5 text-sm">
            <li><Link to="/pricing" className="hover:underline">Pricing</Link></li>
            <li><Link to="/privacy" className="hover:underline">Privacy</Link></li>
            <li><Link to="/terms" className="hover:underline">Terms</Link></li>
            <li><Link to="/data" className="hover:underline">Your data</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-4 font-ident text-[10px] uppercase tracking-[0.16em] text-muted-foreground md:px-6">
          © {new Date().getFullYear()} Peerly
        </p>
      </div>
    </footer>
  );
}
