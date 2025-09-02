import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthButton } from '@/components/AuthButton';

export default function Header() {
  return (
    <header className="flex items-center justify-between py-6 px-4 md:px-8 border-b bg-background">
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <GraduationCap className="w-8 h-8 text-primary" />
          <span className="text-2xl font-bold text-foreground">Peerly</span>
        </Link>
      </div>
      <nav className="flex gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link to="/profile">My Profile</Link>
        </Button>
        <AuthButton />
      </nav>
    </header>
  );
}
