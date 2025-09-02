import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { decodeDOIFromUrl, isValidDOI } from '@/lib/doi';
import { paperUrl } from '@/lib/routing';
import { dataClient } from '@/lib/dataClient';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';

export default function DOIResolverPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const encodedDOI = params.encoded as string;
  const [status, setStatus] = useState<string>('Resolving DOI...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        // User not authenticated, redirect to sign in
        setError('You must be signed in to add papers to your library.');
        setTimeout(() => {
          navigate('/signin', { replace: true });
        }, 3000);
        return;
      }
      resolveDOI();
    }
  }, [encodedDOI, user, authLoading]);

  const resolveDOI = async () => {
    try {
      setError(null);
      const doi = decodeDOIFromUrl(encodedDOI);
      console.log('Decoded DOI:', doi);
      console.log('Original encoded:', encodedDOI);
      
      // Validate DOI format
      if (!isValidDOI(doi)) {
        console.log('DOI validation failed for:', doi);
        setError('Invalid DOI format. Please check the DOI and try again.');
        setTimeout(() => {
          navigate('/?error=invalid-doi-format', { replace: true });
        }, 3000);
        return;
      }

      console.log('DOI validation passed, looking up in database...');
      setStatus('Looking up paper in database...');
      
      // First try to find paper in local database
      let paper = await dataClient.getPaperByDOI(doi);
      console.log('Database lookup result:', paper);
      
      if (!paper) {
        // Show "fetching from APIs" message
        console.log('Paper not found in database, fetching from APIs...');
        setStatus('Fetching paper metadata from academic APIs...');
        paper = await dataClient.lookupPaperByDOI(doi);
        console.log('API lookup result:', paper);
      } else {
        setStatus('Found paper in database!');
      }
      
      if (paper) {
        const redirectUrl = paperUrl(paper);
        console.log('Paper found, redirecting to:', redirectUrl);
        console.log('Paper data:', paper);
        navigate(redirectUrl, { replace: true });
      } else {
        console.log('Paper not found anywhere');
        setError('Paper not found. The DOI may be invalid or the paper may not be available.');
        setTimeout(() => {
          navigate(`/?error=paper-not-found&doi=${encodeURIComponent(doi)}`, { replace: true });
        }, 3000);
      }
    } catch (error) {
      console.error('Error resolving DOI:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      setTimeout(() => {
        navigate('/?error=doi-resolution-failed', { replace: true });
      }, 3000);
    }
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="page-wrapper">
        <Header />
        <main className="page-container">
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold">Checking Authentication</h1>
              <p className="text-muted-foreground max-w-md">
                Please wait while we verify your sign-in status...
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
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
          {error ? (
            <Alert variant="destructive" className="max-w-md">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-semibold">Resolving Paper</h1>
                <p className="text-muted-foreground max-w-md">
                  {status}
                </p>
                <p className="text-sm text-muted-foreground">
                  DOI: {decodeDOIFromUrl(encodedDOI)}
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}