import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // First, try to get the user directly (this handles the OAuth callback)
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError) {
          console.error('Auth callback user error:', userError);
          navigate('/signin');
          return;
        }

        if (userData.user) {
          console.log('OAuth callback successful, user:', userData.user.email);
          // Redirect to home page on successful authentication
          navigate('/');
          return;
        }

        // Fallback: try to get session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Auth callback session error:', sessionError);
          navigate('/signin');
          return;
        }

        if (sessionData.session) {
          console.log('OAuth callback successful via session, user:', sessionData.session.user.email);
          navigate('/');
        } else {
          console.log('No user or session found in auth callback, redirecting to sign in');
          navigate('/signin');
        }
      } catch (error) {
        console.error('Error handling auth callback:', error);
        navigate('/signin');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="page-wrapper">
      <main className="page-container">
        <div className="max-w-md mx-auto space-y-8">
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Signing you in...</h2>
              <p className="text-muted-foreground">
                Please wait while we complete your sign in.
              </p>
            </div>
            <div className="flex justify-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
