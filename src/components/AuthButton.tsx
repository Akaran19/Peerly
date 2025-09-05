import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LogIn, LogOut, User, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';

export function AuthButton() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const navigate = useNavigate();

  const handleSignIn = () => {
    navigate('/signin');
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  if (loading) {
    return (
      <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
    );
  }

  if (!user) {
    return (
      <Button
        onClick={handleSignIn}
        variant="outline"
        size="sm"
      >
        <LogIn className="w-4 h-4 mr-2" />
        Sign In
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={user.imageUrl}
              alt={user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.emailAddresses[0]?.emailAddress}
            />
            <AvatarFallback>
              {user.firstName?.charAt(0) || user.lastName?.charAt(0) || user.emailAddresses[0]?.emailAddress?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            <p className="font-medium">{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName || user.lastName || 'User'}</p>
            <p className="w-[200px] truncate text-sm text-muted-foreground">
              {user.emailAddresses[0]?.emailAddress}
            </p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile">
            <User className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/data">
            <Settings className="mr-2 h-4 w-4" />
            Data & Privacy
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} disabled={isSigningOut}>
          {isSigningOut ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          {isSigningOut ? 'Signing out...' : 'Sign Out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}