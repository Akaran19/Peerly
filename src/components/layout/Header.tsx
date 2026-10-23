import { Link, NavLink } from 'react-router-dom';
import { GraduationCap, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { AuthButton } from '@/components/layout/AuthButton';

const FEEDBACK_URL = 'https://form.typeform.com/to/HBz7cKo8';

const NAV = [
  { to: '/pricing', label: 'Pricing' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/terms', label: 'Terms' },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `font-ident text-[11px] uppercase tracking-[0.16em] transition-colors hover:text-foreground ${
    isActive ? 'text-foreground underline decoration-primary decoration-2 underline-offset-[6px]' : 'text-muted-foreground'
  }`;

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const close = () => setIsMobileMenuOpen(false);

  return (
    <>
      <header className="relative border-b border-foreground/80 bg-background">
        {/* Second hairline under the masthead rule */}
        <div className="absolute inset-x-0 -bottom-[4px] h-px bg-foreground/15" aria-hidden />

        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4 md:px-6">
          <Link to="/" className="group flex items-center gap-2.5" aria-label="Peerly home">
            <GraduationCap className="h-7 w-7 text-brand transition-transform group-hover:-rotate-6 md:h-8 md:w-8" />
            <span className="font-editorial text-[1.65rem] font-semibold leading-none tracking-[-0.02em] md:text-[1.9rem]">
              Peerly
            </span>
          </Link>

          <p className="hidden flex-1 font-editorial text-sm italic text-muted-foreground lg:block">
            A reading log for research papers
          </p>

          <nav className="hidden items-center gap-7 md:flex">
            {NAV.map(item => (
              <NavLink key={item.to} to={item.to} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
            <a
              href={FEEDBACK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-ident text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
            >
              Feedback ↗
            </a>
            <AuthButton />
          </nav>

          <button
            onClick={() => setIsMobileMenuOpen(open => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-foreground/20 md:hidden"
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="border-b bg-card md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-2">
            {NAV.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={close}
                className="border-b py-4 font-editorial text-xl last:border-b-0"
              >
                {item.label}
              </NavLink>
            ))}
            <a
              href={FEEDBACK_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className="border-b py-4 font-editorial text-xl"
            >
              Feedback ↗
            </a>
            <div className="py-4">
              <AuthButton />
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
