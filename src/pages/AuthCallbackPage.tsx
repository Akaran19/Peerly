import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      console.log('🔄 AuthCallbackPage: Starting OAuth callback handling');
      console.log('🔄 Current URL:', window.location.href);
      console.log('🔄 URL search params:', window.location.search);
      console.log('🔄 URL hash:', window.location.hash);

      try {
        // First, try to get the user directly (this handles the OAuth callback)
        console.log('🔄 Trying to get user...');
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError) {
          console.error('❌ Auth callback user error:', userError);
          console.error('❌ Error details:', {
            message: userError.message,
            status: userError.status,
            name: userError.name
          });
          navigate('/signin');
          return;
        }

        if (userData.user) {
          console.log('✅ OAuth callback successful, user:', userData.user.email);
          console.log('✅ User metadata:', userData.user.user_metadata);
          // Redirect to home page on successful authentication
          navigate('/');
          return;
        }

        // Fallback: try to get session
        console.log('🔄 No user found, trying to get session...');
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('❌ Auth callback session error:', sessionError);
          navigate('/signin');
          return;
        }

        if (sessionData.session) {
          console.log('✅ OAuth callback successful via session, user:', sessionData.session.user.email);
          navigate('/');
        } else {
          console.log('⚠️ No user or session found in auth callback, redirecting to sign in');
          console.log('⚠️ Session data:', sessionData);
          navigate('/signin');
        }
      } catch (error) {
        console.error('❌ Error handling auth callback:', error);
        console.error('❌ Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
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
