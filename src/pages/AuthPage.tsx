import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';

export default function AuthPage() {
  const { user, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  return (
    <div className="page-wrapper">
      <Header />
      <main className="page-container">
        <div className="max-w-md mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Welcome to Peerly</h2>
              <p className="text-muted-foreground">
                Track academic papers, rate research, and discover what your peers are reading
              </p>
            </div>
          </div>

          {/* Sign In Form */}
          <Card className="p-6 space-y-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold">Sign in to get started</h3>
              
              <Button 
                onClick={signInWithGoogle}
                size="lg" 
                className="w-full"
              >
                <Mail className="w-4 h-4 mr-2" />
                Continue with Google
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </Card>

          {/* Footer */}
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