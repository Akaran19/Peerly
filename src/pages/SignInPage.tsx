import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, Mail, Github, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SignInPage() {
  const { signInWithGoogle, signInWithGitHub, signInWithEmail, signUpWithEmail, user, loading } = useAuth();
  const navigate = useNavigate();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGitHubLoading, setIsGitHubLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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

  const validatePassword = (password: string): string | null => {
    if (password.length < 12) {
      return 'Password must be at least 12 characters long';
    }
    if (!/[a-zA-Z]/.test(password)) {
      return 'Password must contain at least one letter';
    }
    if (!/\d/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (isSignUp) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }
    }

    setIsEmailLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
        setSuccessMessage('Check your email for a confirmation link');
      } else {
        await signInWithEmail(email, password);
        setSuccessMessage('Sign in successful! Redirecting...');
      }
    } catch (error: any) {
      console.error('Email auth error:', error);
      
      // Provide more user-friendly error messages
      if (error.message?.includes('Invalid login credentials')) {
        if (isSignUp) {
          setError('This email is already registered. Try signing in instead.');
        } else {
          setError('Invalid email or password. Please check your credentials and try again.');
        }
      } else if (error.message?.includes('Email not confirmed')) {
        setError('Please check your email and click the confirmation link before signing in.');
      } else if (error.message?.includes('Too many requests')) {
        setError('Too many sign-in attempts. Please wait a few minutes and try again.');
      } else {
        setError(error.message || 'An error occurred during authentication');
      }
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      await signInWithGoogle();
    } catch (error: any) {
      setError('Google sign in failed');
      setIsGoogleLoading(false);
    }
  };

  const handleGitHubSignIn = async () => {
    setIsGitHubLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      await signInWithGitHub();
    } catch (error: any) {
      setError('GitHub sign in failed');
      setIsGitHubLoading(false);
    }
  };
  return (
    <div className="page-wrapper">
      <Header />
      <main className="page-container">
        <div className="max-w-md mx-auto space-y-6 md:space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-semibold">
                {isSignUp ? 'Create your account' : 'Welcome back'}
              </h2>
              <p className="text-base md:text-lg text-muted-foreground">
                {isSignUp 
                  ? 'Sign up for your academic paper tracking account'
                  : 'Sign in to your academic paper tracking account'
                }
              </p>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {successMessage && (
            <Alert>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          {/* Sign In/Sign Up Form */}
          <Card className="p-4 md:p-6 space-y-4 md:space-y-6">
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  className="h-11 md:h-12"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={isSignUp ? 'Create a strong password' : 'Enter your password'}
                    className="h-11 md:h-12 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {isSignUp && (
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 12 characters with letters and numbers
                  </p>
                )}
                {!isSignUp && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>

              <Button 
                type="submit" 
                size="lg" 
                className="w-full h-11 md:h-12"
                disabled={isEmailLoading}
              >
                {isEmailLoading ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                ) : null}
                {isEmailLoading 
                  ? (isSignUp ? 'Creating account...' : 'Signing in...') 
                  : (isSignUp ? 'Create Account' : 'Sign In')
                }
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

            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <Button 
                variant="outline" 
                size="lg"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="h-11 md:h-12"
              >
                {isGoogleLoading ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                {isGoogleLoading ? 'Signing in...' : 'Google'}
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={handleGitHubSignIn}
                disabled={isGitHubLoading}
                className="h-11 md:h-12"
              >
                {isGitHubLoading ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Github className="w-4 h-4 mr-2" />
                )}
                {isGitHubLoading ? 'Signing in...' : 'GitHub'}
              </Button>
            </div>
          </Card>

          {/* Footer */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button 
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setSuccessMessage('');
                  setEmail('');
                  setPassword('');
                }}
                className="text-primary hover:underline font-medium"
              >
                {isSignUp ? 'Sign in' : 'Sign up for free'}
              </button>
            </p>
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