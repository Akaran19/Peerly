import { createContext, useState, ReactNode, useMemo, useCallback, useContext, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { setGuestMode } from '@/lib/dataClient';
import { setUser as setSentryUser, clearUser as clearSentryUser } from '@/lib/sentry';

// Define a User-like interface that matches Clerk's user structure
interface ClerkUser {
  id: string;
  emailAddresses: Array<{ emailAddress: string }>;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  username?: string;
}

interface AuthContextType {
  user: ClerkUser | null;
  loading: boolean;
  isGuest: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  convertGuestToUser: (user: ClerkUser) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export { AuthContext };

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.error('useAuth called but AuthContext is undefined. This usually means useAuth is being called outside of an AuthProvider.');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut: clerkSignOut, openSignIn } = useClerk();
  const [isGuest, setIsGuest] = useState(false);

  console.log('AuthProvider: clerkUser:', !!clerkUser, 'isLoaded:', isLoaded);

  // Convert Clerk user to our interface
  const user = clerkUser ? {
    id: clerkUser.id,
    emailAddresses: clerkUser.emailAddresses,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    imageUrl: clerkUser.imageUrl,
    username: clerkUser.username
  } : null;

  const loading = !isLoaded;

  // Track user changes in Sentry
  useEffect(() => {
    if (user) {
      setSentryUser({
        id: user.id,
        email: user.emailAddresses?.[0]?.emailAddress,
        username: user.username,
      });
    } else if (!isGuest && isLoaded) {
      // Clear user context when signed out (but not for guests)
      clearSentryUser();
    }
  }, [user, isGuest, isLoaded]);

  const signInWithGoogle = useCallback(async () => {
    console.log('Opening Clerk sign-in modal...');
    try {
      await openSignIn({
        redirectUrl: window.location.href, // Stay on current page after sign-in
      });
    } catch (error) {
      console.error('Failed to open sign-in modal:', error);
    }
  }, [openSignIn]);

  const signInWithGitHub = useCallback(async () => {
    console.log('Opening Clerk sign-in modal for GitHub...');
    try {
      await openSignIn({
        redirectUrl: window.location.href,
      });
    } catch (error) {
      console.error('Failed to open sign-in modal:', error);
    }
  }, [openSignIn]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    console.log('Opening Clerk sign-in modal for email...');
    try {
      await openSignIn({
        redirectUrl: window.location.href,
      });
    } catch (error) {
      console.error('Failed to open sign-in modal:', error);
    }
  }, [openSignIn]);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    console.log('Opening Clerk sign-up modal...');
    try {
      // For sign up, we might need to use a different approach
      // Clerk's openSignIn can handle both sign in and sign up
      await openSignIn({
        redirectUrl: window.location.href,
      });
    } catch (error) {
      console.error('Failed to open sign-up modal:', error);
    }
  }, [openSignIn]);

  const signOut = useCallback(async () => {
    console.log('Starting sign out with Clerk...');
    try {
      await clerkSignOut();

      // Clear guest mode when signing out
      localStorage.removeItem('peerly_guest_mode');
      setIsGuest(false);
      setGuestMode(false);

      // Clear Sentry user context
      clearSentryUser();

      console.log('Sign out successful');
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  }, [clerkSignOut]);

  const continueAsGuest = useCallback(() => {
    setIsGuest(true);
    setGuestMode(true);
    localStorage.setItem('peerly_guest_mode', 'true');
  }, []);

  const convertGuestToUser = useCallback(async (authenticatedUser: ClerkUser) => {
    // This will be called when a guest user signs in
    setIsGuest(false);
    setGuestMode(false);
    localStorage.removeItem('peerly_guest_mode');
  }, []);

  const contextValue = useMemo(() => ({
    user,
    loading,
    isGuest,
    signInWithGoogle,
    signInWithGitHub,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    continueAsGuest,
    convertGuestToUser
  }), [user, loading, isGuest, signInWithGoogle, signInWithGitHub, signInWithEmail, signUpWithEmail, signOut, continueAsGuest, convertGuestToUser]);

  console.log('AuthProvider rendering with context:', !!contextValue);
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}