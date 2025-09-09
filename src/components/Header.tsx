import { Link } from 'react-router-dom';
import { GraduationCap, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AuthButton } from '@/components/AuthButton';

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between py-4 px-4 md:px-8 border-b bg-background">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <GraduationCap className="w-7 h-7 md:w-8 md:h-8 text-primary" />
            <span className="text-xl md:text-2xl font-bold text-foreground">Peerly</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="https://form.typeform.com/to/HBz7cKo8" target="_blank" rel="noopener noreferrer">Feedback</a>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/pricing">Pricing</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/privacy">Privacy</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/terms">Terms</Link>
          </Button>
          <AuthButton />
        </nav>

        {/* Mobile Navigation */}
        <div className="flex md:hidden items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 h-10 w-10"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            <span className="sr-only">Menu</span>
          </Button>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b bg-background shadow-lg">
          <nav className="px-4 py-6 space-y-3">
            <Button variant="ghost" size="lg" asChild className="w-full justify-start h-12">
              <a href="https://form.typeform.com/to/HBz7cKo8" target="_blank" rel="noopener noreferrer" onClick={() => setIsMobileMenuOpen(false)}>
                Feedback
              </a>
            </Button>
            <Button variant="ghost" size="lg" asChild className="w-full justify-start h-12">
              <Link to="/pricing" onClick={() => setIsMobileMenuOpen(false)}>
                Pricing
              </Link>
            </Button>
            <Button variant="ghost" size="lg" asChild className="w-full justify-start h-12">
              <Link to="/privacy" onClick={() => setIsMobileMenuOpen(false)}>
                Privacy
              </Link>
            </Button>
            <Button variant="ghost" size="lg" asChild className="w-full justify-start h-12">
              <Link to="/terms" onClick={() => setIsMobileMenuOpen(false)}>
                Terms
              </Link>
            </Button>
            <div className="pt-3 border-t">
              <AuthButton />
            </div>
          </nav>
        </div>
      )}

    </>
  );
}
