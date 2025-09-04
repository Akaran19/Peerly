import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { SignIn } from '@clerk/clerk-react';

export default function SignInPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect to home if user is already signed in
  useEffect(() => {
    if (user && !loading) {
      console.log('User is signed in, redirecting to home...');
      navigate('/');
    }
  }, [user, loading, navigate]);

  // Show loading state while auth is in progress
  if (loading) {
    return (
      <div className="page-wrapper">
        <Header />
        <main className="page-container">
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold">Signing you in...</h1>
              <p className="text-muted-foreground max-w-md">
                Please wait while we complete your sign-in.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <Header />
      <main className="page-container">
        <div className="max-w-md mx-auto space-y-6 md:space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-semibold">
                Welcome back
              </h2>
              <p className="text-base md:text-lg text-muted-foreground">
                Sign in to your academic paper tracking account
              </p>
            </div>
          </div>

          {/* Clerk Sign In */}
          <div className="max-w-md mx-auto">
            <SignIn 
              routing="virtual"
              redirectUrl="/"
            />
          </div>

          {/* Footer */}
          <div className="text-center space-y-2">
            <Link 
              to="/"
              className="inline-block text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}