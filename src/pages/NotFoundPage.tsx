import { Link } from 'react-router-dom';
import { GraduationCap, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';

export default function NotFoundPage() {
  return (
    <div className="page-wrapper">
      <Header />
      <main className="page-container">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 text-center">
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-primary/10 rounded-2xl">
                <GraduationCap className="w-12 h-12 text-primary" />
              </div>
            </div>
            <h1 className="text-6xl font-bold text-foreground">404</h1>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Paper Not Found</h2>
              <p className="text-muted-foreground max-w-md">
                The academic paper or page you're looking for doesn't exist in our database.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild size="lg">
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                Return Home
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/signin">
                Sign In
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}