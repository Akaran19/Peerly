import { createContext, useEffect, useState, ReactNode, useMemo, useCallback, useContext } from 'react';
import { useUser, useClerk, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { supabase, setTokenProvider } from '@/integrations/supabase/client';
import { setGuestMode } from '@/lib/dataClient';

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
  const { signOut: clerkSignOut } = useClerk();
  const { getToken } = useClerkAuth();
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

  const upsertProfile = useCallback(async (user: ClerkUser) => {
    try {
      const handle = (user.username ||
                      user.emailAddresses[0]?.emailAddress?.split('@')[0] ||
                      user.id.slice(0, 8)).toLowerCase();

      const name = user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.firstName || user.lastName || handle;

      // Use RPC to get or create profile and get the UUID
      const { data: profileId, error } = await supabase
        .rpc('get_or_create_profile', {
          p_clerk_id: user.id,
          p_handle: handle,
          p_image: user.imageUrl || null,
          p_name: name
        });

      if (error) {
        console.error('Error getting/creating profile:', error);
        return null;
      }

      return profileId;
    } catch (error) {
      console.error('Error upserting profile:', error);
      return null;
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    console.log('Google sign in handled by Clerk SignIn component');
    // Clerk handles OAuth automatically when using their SignIn component
  }, []);

  const signInWithGitHub = useCallback(async () => {
    console.log('GitHub sign in handled by Clerk SignIn component');
    // Clerk handles OAuth automatically when using their SignIn component
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    console.log('Email sign in handled by Clerk SignIn component');
    // Clerk handles email auth automatically when using their SignIn component
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    console.log('Email sign up handled by Clerk SignIn component');
    // Clerk handles email auth automatically when using their SignIn component
  }, []);

  const signOut = useCallback(async () => {
    console.log('Starting sign out with Clerk...');
    try {
      await clerkSignOut();

      // Clear token provider
      setTokenProvider(async () => null);

      // Clear guest mode when signing out
      localStorage.removeItem('peerly_guest_mode');
      setIsGuest(false);
      setGuestMode(false);

      console.log('Sign out successful');
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  }, [clerkSignOut]);

  const continueAsGuest = useCallback(() => {
    // Clear token provider when switching to guest mode
    setTokenProvider(async () => null);
    
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

  useEffect(() => {
    const setupTokenProvider = () => {
      if (clerkUser) {
        // Set up token provider for authenticated users
        setTokenProvider(async () => {
          try {
            const token = await getToken();
            console.log('Providing Clerk JWT token:', !!token);
            return token ?? null;
          } catch (error) {
            console.error('Error getting Clerk token:', error);
            return null;
          }
        });
      } else {
        // Clear token provider when user is not signed in
        setTokenProvider(async () => null);
      }
    };

    if (isLoaded) {
      setupTokenProvider();
    }
  }, [clerkUser, isLoaded, getToken]);

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