import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { User, UserPaper, Shelf } from '@/types';
import { dataClient } from '@/lib/dataClient';
import { UserLibraryTabs } from '@/components/UserLibraryTabs';
import { User as UserIcon, Settings, Calendar, BookOpen, Star, MessageSquare, Edit3, Check, X, Upload, Camera } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { GuestStorage } from '@/lib/guestStorage';
import { getTier, type Tier } from '@/lib/account';

export default function ProfilePage() {
  const { user: authUser, loading: authLoading, isGuest } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [userPapers, setUserPapers] = useState<UserPaper[]>([]);
  const [stats, setStats] = useState({
    totalPapers: 0,
    averageRating: 0,
    totalReviews: 0,
    readThisYear: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string>('2023');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    image: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userTier, setUserTier] = useState<Tier>('free');

  useEffect(() => {
    if (!authLoading) {
      if (authUser) {
        console.log('User is authenticated, loading profile...');
        loadUserProfile();
      } else if (isGuest) {
        console.log('User is in guest mode, setting up guest profile...');
        loadGuestProfile();
      } else {
        console.log('User is not authenticated and not in guest mode');
        // Reset state when user signs out
        setUser(null);
        setUserPapers([]);
        setStats({
          totalPapers: 0,
          averageRating: 0,
          totalReviews: 0,
          readThisYear: 0
        });
        setError(null);
        setIsLoading(false);
      }
    }
    loadUserTier();
  }, [authLoading, authUser, isGuest]);

  const loadUserTier = async () => {
    try {
      const tier = await getTier();
      setUserTier(tier);
    } catch (error) {
      console.error('Error loading user tier:', error);
      // Keep default 'free' tier on error
    }
  };

    const loadUserProfile = async () => {
    if (!authUser) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      
      console.log('Auth user in ProfilePage:', authUser);
      console.log('Auth user ID:', authUser?.id);
      
      // Try to get or create profile using supabaseHelpers
      console.log('Trying to get existing profile...');
      const { getCurrentUserId } = await import('@/lib/supabaseHelpers');
      const profileId = await getCurrentUserId(authUser.id);

      let profileData: any = profileId;

      // Fetch user's papers using supabaseHelpers (which handles auth properly)
      console.log('Fetching user papers for profile ID:', profileData);
      const { getUserPapers } = await import('@/lib/supabaseHelpers');
      const userPapersData = await getUserPapers(profileData);
      console.log('User papers data:', userPapersData);

            // Now fetch the full profile data using supabaseHelpers
      const { getCurrentUserProfile } = await import('@/lib/supabaseHelpers');
      const fullProfileData = await getCurrentUserProfile(authUser.id);

      if (!fullProfileData) {
        console.error('Error fetching full profile: No profile data returned');
        setError('Failed to load your profile data. Please try refreshing the page.');
        setIsLoading(false);
        return;
      }

      console.log('Full profile data:', fullProfileData);

      // Transform profile data to match User type
      const userData: User = {
        id: fullProfileData.id, // This is the UUID from the database
        name: fullProfileData.name || 'Unknown User',
        handle: fullProfileData.handle || fullProfileData.id.slice(0, 8),
        image: fullProfileData.image || null
      };

      // Calculate member since date
      const memberSince = (fullProfileData as any)?.created_at 
        ? new Date((fullProfileData as any).created_at).getFullYear().toString()
        : '2023';

      // Transform papers data to match UserPaper type
      const transformedPapers: UserPaper[] = (userPapersData || []).map(p => ({
        id: p.id,
        user_id: p.user_id,
        paper_id: p.paper_id,
        shelf: p.shelf as Shelf,
        rating: p.rating,
        review: p.review,
        created_at: p.created_at || '',
        updated_at: p.updated_at || '',
        upvotes: p.upvotes || 0
      }));

      // Calculate stats
      const totalPapers = transformedPapers.length;
      const ratingsData = transformedPapers.filter(p => p.rating !== null);
      const averageRating = ratingsData.length > 0 
        ? ratingsData.reduce((sum, p) => sum + (p.rating || 0), 0) / ratingsData.length
        : 0;
      const totalReviews = transformedPapers.filter(p => p.review && p.review.trim()).length;
      const currentYear = new Date().getFullYear();
      const readThisYear = transformedPapers.filter(p => 
        p.shelf === 'READ' && new Date(p.updated_at).getFullYear() === currentYear
      ).length;

      setUser(userData);
      setUserPapers(transformedPapers);
      setMemberSince(memberSince);
      setStats({
        totalPapers,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
        readThisYear
      });

      // Update edit form with current user data
      setEditForm({
        name: userData.name,
        image: userData.image || ''
      });
    } catch (error) {
      setError('An unexpected error occurred. Please try refreshing the page.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadGuestProfile = async () => {
    try {
      setError(null);
      
      // Create a guest user profile
      const guestUser: User = {
        id: 'guest',
        name: 'Guest User',
        handle: 'guest',
        image: null
      };

      // Load guest papers from localStorage
      const guestPapers = GuestStorage.getUserPapers();
      
      // Transform papers data to match UserPaper type
      const transformedPapers: UserPaper[] = guestPapers.map(p => ({
        id: p.id,
        user_id: p.user_id,
        paper_id: p.paper_id,
        shelf: p.shelf as Shelf,
        rating: p.rating,
        review: p.review,
        created_at: p.created_at || '',
        updated_at: p.updated_at || '',
        upvotes: p.upvotes || 0
      }));

      // Calculate stats
      const totalPapers = transformedPapers.length;
      const ratingsData = transformedPapers.filter(p => p.rating !== null);
      const averageRating = ratingsData.length > 0 
        ? ratingsData.reduce((sum, p) => sum + (p.rating || 0), 0) / ratingsData.length
        : 0;
      const totalReviews = transformedPapers.filter(p => p.review && p.review.trim()).length;
      const currentYear = new Date().getFullYear();
      const readThisYear = transformedPapers.filter(p => 
        p.shelf === 'READ' && new Date(p.updated_at).getFullYear() === currentYear
      ).length;

      setUser(guestUser);
      setUserPapers(transformedPapers);
      setMemberSince('2023');
      setStats({
        totalPapers,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
        readThisYear
      });

      // Update edit form with current user data
      setEditForm({
        name: guestUser.name,
        image: guestUser.image || ''
      });
    } catch (error) {
      setError('An unexpected error occurred. Please try refreshing the page.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProfile = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset form to current user data
    if (user) {
      setEditForm({
        name: user.name,
        image: user.image || ''
      });
    }
    setSelectedImageFile(null);
    setImagePreview(null);
  };

  const handleImageFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file.');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file size must be less than 5MB.');
        return;
      }

      setSelectedImageFile(file);
      setError(null);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImageToSupabase = async (file: File): Promise<string | null> => {
    if (!authUser) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${authUser.id}-${Date.now()}.${fileExt}`;
    const filePath = `profile-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error('Failed to upload image');
    }

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSaveProfile = async () => {
    if (!authUser || !user) return;

    setIsSaving(true);
    try {
      let imageUrl = editForm.image;

      // Upload new image if selected
      if (selectedImageFile) {
        const uploadedUrl = await uploadImageToSupabase(selectedImageFile);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          name: editForm.name.trim(),
          image: imageUrl.trim() || null
        })
        .eq('id', user.id);

      if (error) {
        setError('Failed to update profile. Please try again.');
        return;
      }

      // Update local state
      setUser({
        ...user,
        name: editForm.name.trim(),
        image: imageUrl.trim() || null
      });

      setIsEditing(false);
      setSelectedImageFile(null);
      setImagePreview(null);
      setError(null);
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-wrapper">
        <main className="page-container">
          <div className="animate-pulse space-y-8">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-muted rounded-full"></div>
              <div className="space-y-2">
                <div className="h-8 bg-muted rounded w-48"></div>
                <div className="h-6 bg-muted rounded w-32"></div>
                <div className="h-10 bg-muted rounded w-40"></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="academic-card p-4 animate-pulse">
                  <div className="h-12 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrapper">
        <main className="page-container">
          <div className="text-center py-12">
            <h1 className="text-4xl font-bold mb-4 text-destructive">Error Loading Profile</h1>
            <p className="text-muted-foreground mb-8">
              {error}
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => loadUserProfile()} variant="outline">
                Try Again
              </Button>
              <Link to="/" className="text-primary hover:underline">
                ← Back to home
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!user && !isGuest) {
    return (
      <div className="page-wrapper">
        <main className="page-container">
          <div className="text-center py-12">
            <h1 className="text-4xl font-bold mb-4">Please Sign In</h1>
            <p className="text-muted-foreground mb-8">
              You need to be signed in to view your profile.
            </p>
            <Link to="/signin" className="text-primary hover:underline">
              ← Go to Sign In
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <Header />
      <main className="page-container">

        <div className="space-y-8">
          {/* Profile Header */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
            <Avatar className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
              <AvatarImage src={user.image} alt={user.name} />
              <AvatarFallback className="text-lg sm:text-xl bg-primary/10">
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          value={editForm.name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Your full name"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Profile Picture</Label>
                        <div className="mt-2 flex items-center gap-4">
                          <Avatar className="w-16 h-16">
                            <AvatarImage src={imagePreview || editForm.image || user.image} alt={user.name} />
                            <AvatarFallback className="text-lg bg-primary/10">
                              {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              className="gap-2"
                            >
                              <Camera className="w-4 h-4" />
                              {selectedImageFile ? 'Change Photo' : 'Upload Photo'}
                            </Button>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleImageFileSelect}
                              className="hidden"
                            />
                            <p className="text-xs text-muted-foreground">
                              JPG, PNG or GIF. Max 5MB.
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSaveProfile}
                          disabled={isSaving || !editForm.name.trim()}
                          size="sm"
                          className="gap-2"
                        >
                          {isSaving ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              Save
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={handleCancelEdit}
                          variant="outline"
                          size="sm"
                          disabled={isSaving}
                          className="gap-2"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
                        {user.name}
                      </h1>
                      <p className="text-base sm:text-lg text-muted-foreground mb-4">
                        @{user.handle}
                      </p>
                    </>
                  )}
                </div>
                
                {!isEditing && (
                  <div className="flex-shrink-0">
                    <Button
                      onClick={handleEditProfile}
                      variant="outline"
                      size="sm"
                      className="gap-2 w-full sm:w-auto"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit Profile
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-4">
                <Badge variant="secondary" className="w-fit">
                  <Calendar className="w-3 h-3 mr-1" />
                  Member since {memberSince}
                </Badge>
                <Link 
                  to="/settings" 
                  className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 w-fit"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div className="text-2xl font-bold">{stats.totalPapers}</div>
              <div className="text-sm text-muted-foreground">Papers Tracked</div>
            </Card>
            
            <Card className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Star className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-2xl font-bold">
                {stats.averageRating > 0 ? stats.averageRating : '—'}
              </div>
              <div className="text-sm text-muted-foreground">Avg Rating</div>
            </Card>
            
            <Card className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <MessageSquare className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold">{stats.totalReviews}</div>
              <div className="text-sm text-muted-foreground">Reviews Written</div>
            </Card>
            
            <Card className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Calendar className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="text-2xl font-bold">{stats.readThisYear}</div>
              <div className="text-sm text-muted-foreground">Read This Year</div>
            </Card>
          </div>

          {/* Library */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">My Library</h2>
            <UserLibraryTabs userId={user.id} userPapers={userPapers} tier={userTier} />
          </div>
        </div>
      </main>
    </div>
  );
}