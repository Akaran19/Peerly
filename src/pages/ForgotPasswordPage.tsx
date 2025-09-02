import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import Header from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email) {
      setError('Please enter your email address');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      setSuccess(true);
    } catch (error: any) {
      console.error('Password reset error:', error);

      if (error.message?.includes('User not found')) {
        setError('No account found with this email address');
      } else if (error.message?.includes('Too many requests')) {
        setError('Too many reset requests. Please wait a few minutes and try again.');
      } else {
        setError(error.message || 'Failed to send password reset email');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="page-wrapper">
        <Header />
        <main className="page-container">
          <div className="max-w-md mx-auto space-y-8">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-full">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Check your email</h2>
                <p className="text-muted-foreground">
                  We've sent a password reset link to <strong>{email}</strong>
                </p>
              </div>
            </div>

            <Card className="p-6 space-y-4">
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Click the link in the email to reset your password. The link will expire in 1 hour.
                </p>

                <div className="space-y-2">
                  <Button
                    onClick={() => navigate('/signin')}
                    className="w-full"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to sign in
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    Didn't receive the email? Check your spam folder or{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setSuccess(false);
                        setError('');
                      }}
                      className="text-primary hover:underline"
                    >
                      try again
                    </button>
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <Header />
      <main className="page-container">
        <div className="max-w-md mx-auto space-y-8">
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Reset your password</h2>
              <p className="text-muted-foreground">
                Enter your email address and we'll send you a link to reset your password
              </p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card className="p-6 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  className="h-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                {isLoading ? 'Sending reset link...' : 'Send reset link'}
              </Button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/signin')}
                className="text-sm text-primary hover:underline"
              >
                <ArrowLeft className="w-4 h-4 mr-1 inline" />
                Back to sign in
              </button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
