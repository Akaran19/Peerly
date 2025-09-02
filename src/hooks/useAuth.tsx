import { createContext, useEffect, useState, ReactNode, useMemo, useCallback, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { setGuestMode } from '@/lib/dataClient';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  convertGuestToUser: (user: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const upsertProfile = useCallback(async (user: User) => {
    try {
      const handle = (user.user_metadata?.preferred_username ||
                      user.email?.split('@')[0] ||
                      user.id.slice(0, 8)).toLowerCase();

      await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          handle,
          name: user.user_metadata?.full_name || user.user_metadata?.name || handle,
          image: user.user_metadata?.avatar_url || null,
        }, { onConflict: 'id' });
    } catch (error) {
      console.error('Error upserting profile:', error);
    }
  }, []);

    const signInWithGoogle = useCallback(async () => {
    console.log('Starting Google sign in...');

    // Use the current origin as the redirect URL to ensure OAuth callbacks work properly
    const redirectUrl = `${window.location.origin}/auth`;

    console.log('Using redirect URL:', redirectUrl);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });

    if (error) {
      console.error('Google sign in error:', error);
      throw error;
    }

    console.log('Google sign in initiated successfully');
  }, []);

  const signInWithGitHub = useCallback(async () => {
    console.log('Starting GitHub sign in...');

    // Use the current origin as the redirect URL to ensure OAuth callbacks work properly
    const redirectUrl = `${window.location.origin}/auth`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: redirectUrl,
        scopes: 'read:user,user:email'
      }
    });

    if (error) {
      console.error('GitHub sign in error:', error);
      throw error;
    }

    console.log('GitHub sign in initiated successfully');
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    console.log('Starting email sign in...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Email sign in error:', error);
      throw error;
    }

    if (data.user) {
      console.log('Email sign in successful for user:', data.user.email);
      // The auth state change should be handled by the onAuthStateChange listener
    } else {
      console.warn('Email sign in completed but no user data returned');
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    console.log('Starting email sign up...');
    const { error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      console.error('Email sign up error:', error);
      throw error;
    }

    console.log('Email sign up successful');
  }, []);

  const signOut = useCallback(async () => {
    console.log('Starting sign out...');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        throw error;
      }
      
      // Clear guest mode when signing out
      localStorage.removeItem('peerly_guest_mode');
      setIsGuest(false);
      setGuestMode(false);
      
      // Clear user and session state immediately
      setUser(null);
      setSession(null);
      
      console.log('Sign out successful');
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  }, []);

  const continueAsGuest = useCallback(() => {
    setIsGuest(true);
    setGuestMode(true);
    localStorage.setItem('peerly_guest_mode', 'true');
    setLoading(false);
  }, []);

  const convertGuestToUser = useCallback(async (authenticatedUser: User) => {
    // This will be called when a guest user signs in
    // We could potentially migrate their local data to the database here
    setIsGuest(false);
    setGuestMode(false);
    localStorage.removeItem('peerly_guest_mode');
    setUser(authenticatedUser);
  }, []);

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener immediately
    console.log('Setting up auth state listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state change:', event, session?.user?.email, { hasSession: !!session });
        
        if (event === 'SIGNED_OUT') {
          console.log('User signed out, clearing state');
          setSession(null);
          setUser(null);
          setIsGuest(false);
          setGuestMode(false);
          localStorage.removeItem('peerly_guest_mode');
        } else if (event === 'SIGNED_IN' && session) {
          console.log('User signed in:', session.user.email);
          console.log('Session details:', {
            access_token: !!session.access_token,
            refresh_token: !!session.refresh_token,
            expires_at: session.expires_at
          });
          setSession(session);
          setUser(session.user);
          setIsGuest(false);
          setGuestMode(false);

          // Create/update profile when user signs in
          setTimeout(() => {
            upsertProfile(session.user);
          }, 0);

          // Clean up URL after auth state change
          if (window.location.hash.includes('access_token')) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed for user:', session?.user?.email);
          setSession(session);
          setUser(session?.user ?? null);
        }

        setLoading(false);
      }
    );

    // Check if user was previously in guest mode
    const wasGuest = localStorage.getItem('peerly_guest_mode') === 'true';
    if (wasGuest && mounted) {
      console.log('User was previously in guest mode, checking for existing session...');
      // Don't set guest mode immediately, check for session first
    }

    // For new users, automatically start in guest mode
    const hasVisitedBefore = localStorage.getItem('peerly_has_visited');
    if (!hasVisitedBefore && mounted) {
      console.log('First time visitor, will set guest mode after session check');
      localStorage.setItem('peerly_has_visited', 'true');
      // Don't set guest mode immediately
    }

    // Check for existing session
    const checkExistingSession = async () => {
      console.log('Checking for existing session...');
      try {
        const { data, error } = await supabase.auth.getSession();
        console.log('Session check result:', { session: !!data.session, error });
        if (error) {
          console.error('Error getting session:', error);
        } else if (data.session && mounted) {
          console.log('Found existing session for user:', data.session.user.email);
          setSession(data.session);
          setUser(data.session.user);
          setIsGuest(false);
          setGuestMode(false);
        } else {
          console.log('No existing session found, checking guest mode...');
          // No session found, check guest mode
          const wasGuest = localStorage.getItem('peerly_guest_mode') === 'true';
          if (wasGuest && mounted) {
            console.log('Setting guest mode from localStorage');
            setIsGuest(true);
            setGuestMode(true);
          } else if (!hasVisitedBefore && mounted) {
            console.log('Setting guest mode for first-time visitor');
            setIsGuest(true);
            setGuestMode(true);
          } else {
            console.log('No guest mode, user needs to sign in');
            setIsGuest(false);
            setGuestMode(false);
          }
        }
      } catch (error) {
        console.error('Error handling auth callback:', error);
        // On error, default to guest mode for new users
        if (!hasVisitedBefore && mounted) {
          setIsGuest(true);
          setGuestMode(true);
        }
      }
      setLoading(false);
    };

    checkExistingSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [upsertProfile]);

  const contextValue = useMemo(() => ({
    user,
    session,
    loading,
    isGuest,
    signInWithGoogle,
    signInWithGitHub,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    continueAsGuest,
    convertGuestToUser
  }), [user, session, loading, isGuest, signInWithGoogle, signInWithGitHub, signInWithEmail, signUpWithEmail, signOut, continueAsGuest, convertGuestToUser]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}