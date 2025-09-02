import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, Mail, Github } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';

export default function SignInPage() {
  return (
    <div className="page-wrapper">
      <Header />
      <main className="page-container">
        <div className="max-w-md mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Welcome back</h2>
              <p className="text-muted-foreground">
                Sign in to your academic paper tracking account
              </p>
            </div>
          </div>

          {/* Sign In Form */}
          <Card className="p-6 space-y-6">
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  className="h-11"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  className="h-11"
                />
              </div>

              <Button type="submit" size="lg" className="w-full">
                Sign In
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" size="lg">
                <Mail className="w-4 h-4 mr-2" />
                Google
              </Button>
              <Button variant="outline" size="lg">
                <Github className="w-4 h-4 mr-2" />
                GitHub
              </Button>
            </div>
          </Card>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Don't have an account?{' '}
              <Link to="#" className="text-primary hover:underline">
                Sign up for free
              </Link>
            </p>
          </div>

          <div className="text-center">
            <Link 
              to="/"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}