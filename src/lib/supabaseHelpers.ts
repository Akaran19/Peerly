import { supabase } from '@/integrations/supabase/client';
import { GuestStorage } from './guestStorage';
import { decodeDOIFromUrl } from './doi';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://xaibkgwkdzzipntvzldg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhaWJrZ3drZHp6aXBudHZ6bGRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3MjEzNzEsImV4cCI6MjA3MjI5NzM3MX0.dj2lWGT1IzTNhno3uEVRd2eANWw42mLJvoq6V_-FHm0";

// Create a separate supabase client for user_papers queries that doesn't use JWT
const supabaseUserPapers = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'apikey': SUPABASE_PUBLISHABLE_KEY
    }
  }
  // Note: No accessToken function, so it won't send JWT tokens
});

// Create a separate supabase client for profile queries that doesn't use JWT
const supabaseProfiles = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'apikey': SUPABASE_PUBLISHABLE_KEY
    }
  }
  // Note: No accessToken function, so it won't send JWT tokens
});

// Helper to check if user is in guest mode
function isGuestMode() {
  return localStorage.getItem('peerly_guest_mode') === 'true';
}

export async function getCurrentUserId(clerkUserId?: string) {
  console.log('getCurrentUserId called with clerkUserId:', clerkUserId);
  
  if (isGuestMode()) {
    console.log('Guest mode detected, returning guest-user');
    return 'guest-user';
  }

  // If Clerk user ID is not provided, we can't get the profile ID
  // This function should be called with the Clerk user ID from the React components
  if (!clerkUserId) {
    console.error('getCurrentUserId called without Clerk user ID');
    return null;
  }

  try {
    // First, try to find existing profile
    console.log('Looking for existing profile with clerk_id:', clerkUserId);
    const { data: existingProfile, error: findError } = await supabaseProfiles
      .from('profiles')
      .select('id')
      .eq('clerk_id', clerkUserId)
      .single();

    console.log('Existing profile query result:', { existingProfile, findError });

    if (!findError && existingProfile) {
      console.log('Found existing profile:', existingProfile.id);
      return existingProfile.id;
    }

    // If profile doesn't exist, create it using direct queries instead of RPC
    console.log('Profile not found, creating new profile');
    const { error: createError } = await supabaseProfiles
      .from('profiles')
      .insert({
        clerk_id: clerkUserId,
        handle: null,
        name: null,
        image: null
      } as any);

    if (createError) {
      console.error('Error creating profile:', createError);
      return null;
    }

    // Fetch the newly created profile
    const { data: newProfile, error: fetchError } = await supabaseProfiles
      .from('profiles')
      .select('id')
      .eq('clerk_id', clerkUserId)
      .single();

    if (fetchError || !newProfile) {
      console.error('Error fetching created profile:', fetchError);
      return null;
    }

    console.log('Created new profile:', newProfile.id);
    return newProfile.id;
  } catch (error) {
    console.error('Error in getCurrentUserId:', error);
    return null;
  }
}

export async function getCurrentUserProfile(clerkUserId?: string) {
  const userId = await getCurrentUserId(clerkUserId);
  if (!userId) return null;

  const { data, error } = await supabaseProfiles
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  return data;
}

export async function upsertUserPaper(input: {
  paper_id: string;
  shelf: 'WANT' | 'READING' | 'READ';
  rating?: number | null;
  review?: string | null;
}, clerkUserId?: string) {
  console.log('upsertUserPaper called with:', { input, clerkUserId, isGuestMode: isGuestMode() });

  // Handle guest paper IDs for authenticated users
  if (input.paper_id.startsWith('guest-') && !isGuestMode()) {
    try {
      // Extract DOI from guest ID
      const guestPrefix = 'guest-';
      const encodedDoi = input.paper_id.slice(guestPrefix.length);
      const doi = decodeDOIFromUrl(encodedDoi);

      // Import dataClient to lookup the paper
      const { dataClient } = await import('./dataClient');
      const realPaper = await dataClient.lookupPaperByDOI(doi);
      if (realPaper) {
        // Use the real paper ID
        input.paper_id = realPaper.id;
      } else {
        // Fallback to GuestStorage
        return GuestStorage.upsertUserPaper(input.paper_id, {
          shelf: input.shelf,
          rating: input.rating,
          review: input.review
        });
      }
    } catch (error) {
      console.error('Error converting guest paper to real paper:', error);
      return GuestStorage.upsertUserPaper(input.paper_id, {
        shelf: input.shelf,
        rating: input.rating,
        review: input.review
      });
    }
  }

  if (isGuestMode() || input.paper_id.startsWith('guest-')) {
    console.log('Using guest storage');
    return GuestStorage.upsertUserPaper(input.paper_id, {
      shelf: input.shelf,
      rating: input.rating,
      review: input.review
    });
  }

  console.log('Getting current user ID for clerkUserId:', clerkUserId);
  const userId = await getCurrentUserId(clerkUserId);
  console.log('Database user ID:', userId);

  if (!userId) throw new Error('Not signed in');

  try {
    const { data, error } = await supabaseUserPapers
      .from('user_papers')
      .upsert({
        user_id: userId,
        ...input
      }, {
        onConflict: 'user_id,paper_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase upsert error:', error);
      // If RLS blocks access, try with guest storage as fallback
      if (error.code === 'PGRST301' || error.message?.includes('Unauthorized')) {
        console.log('JWT auth error, falling back to guest storage');
        return GuestStorage.upsertUserPaper(`${input.paper_id}`, {
          shelf: input.shelf,
          rating: input.rating,
          review: input.review
        });
      }
      throw error;
    }

    console.log('Upsert successful:', data);
    return data as any; // Cast to match UserPaper type
  } catch (error) {
    console.error('Exception in upsertUserPaper:', error);
    // If it's an auth error, fall back to guest storage
    if (error.code === 'PGRST301' || error.message?.includes('Unauthorized')) {
      console.log('JWT auth error in exception, falling back to guest storage');
      return GuestStorage.upsertUserPaper(`${input.paper_id}`, {
        shelf: input.shelf,
        rating: input.rating,
        review: input.review
      });
    }
    // Re-throw the error so the UI can handle it appropriately
    throw error;
  }
}

export async function getUserPaper(paperId: string, clerkUserId?: string) {
  // Handle guest paper IDs for authenticated users
  if (paperId.startsWith('guest-') && !isGuestMode()) {
    try {
      // Extract DOI from guest ID
      const guestPrefix = 'guest-';
      const encodedDoi = paperId.slice(guestPrefix.length);
      const doi = decodeDOIFromUrl(encodedDoi);

      // Import dataClient to lookup the paper
      const { dataClient } = await import('./dataClient');
      const realPaper = await dataClient.lookupPaperByDOI(doi);
      if (realPaper) {
        // Use the real paper ID
        paperId = realPaper.id;
      } else {
        // Fallback to GuestStorage
        return GuestStorage.getUserPaper(paperId);
      }
    } catch (error) {
      console.error('Error converting guest paper to real paper:', error);
      return GuestStorage.getUserPaper(paperId);
    }
  }

  if (isGuestMode() || paperId.startsWith('guest-')) {
    return GuestStorage.getUserPaper(paperId);
  }

  const userId = await getCurrentUserId(clerkUserId);
  if (!userId) return null;

  try {
    const { data, error } = await supabaseUserPapers
      .from('user_papers')
      .select('*')
      .eq('user_id', userId)
      .eq('paper_id', paperId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user paper:', error);
      // If RLS blocks access, try guest storage as fallback
      if (error.code === 'PGRST301' || error.message?.includes('Unauthorized')) {
        console.log('JWT auth error, falling back to guest storage for getUserPaper');
        return GuestStorage.getUserPaper(paperId);
      }
      return null;
    }
    return data as any; // Cast to match UserPaper type
  } catch (error) {
    console.error('Exception in getUserPaper:', error);
    // If it's an auth error, fall back to guest storage
    if (error.code === 'PGRST301' || error.message?.includes('Unauthorized')) {
      console.log('JWT auth error in exception, falling back to guest storage');
      return GuestStorage.getUserPaper(paperId);
    }
    // Return null on any error to prevent app crashes
    return null;
  }
}

export async function getUserPapers(userId: string, shelf?: 'WANT' | 'READING' | 'READ') {
  if (isGuestMode()) {
    if (shelf) {
      return GuestStorage.getUserPapersByShelf(shelf);
    }
    return GuestStorage.getUserPapers();
  }

  try {
    let query = supabaseUserPapers
      .from('user_papers')
      .select(`
        *,
        papers (
          id,
          title,
          abstract,
          year,
          journal,
          doi
        )
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (shelf) {
      query = query.eq('shelf', shelf);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching user papers:', error);
      // If RLS blocks access, return empty array instead of failing
      if (error.code === 'PGRST301' || error.message?.includes('Unauthorized')) {
        console.log('JWT auth error, returning empty array');
        return [];
      }
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Exception in getUserPapers:', error);
    // Return empty array on any error to prevent app crashes
    return [];
  }
}

export async function getPaperAggregates(paperId: string) {
  // Handle guest paper IDs for authenticated users
  if (paperId.startsWith('guest-') && !isGuestMode()) {
    try {
      // Extract DOI from guest ID
      const guestPrefix = 'guest-';
      const encodedDoi = paperId.slice(guestPrefix.length);
      const doi = decodeDOIFromUrl(encodedDoi);

      // Import dataClient to lookup the paper
      const { dataClient } = await import('./dataClient');
      const realPaper = await dataClient.lookupPaperByDOI(doi);
      if (realPaper) {
        // Use the real paper ID
        paperId = realPaper.id;
      } else {
        // Fallback to default stats
        return { avgRating: 0, count: 0, latest: [] };
      }
    } catch (error) {
      console.error('Error converting guest paper to real paper:', error);
      return { avgRating: 0, count: 0, latest: [] };
    }
  }

  // For guest papers, return default stats
  if (paperId.startsWith('guest-')) {
    return { avgRating: 0, count: 0, latest: [] };
  }

  try {
    // Get ratings - try with error handling for RLS issues
    const { data: ratingData, error: ratingError } = await supabaseUserPapers
      .from('user_papers')
      .select('rating')
      .eq('paper_id', paperId);

    if (ratingError) {
      console.error('Error fetching paper aggregates:', ratingError);
      // If RLS blocks access, return default stats instead of failing
      if (ratingError.code === 'PGRST301' || ratingError.message?.includes('Unauthorized')) {
        console.log('JWT auth error, returning default stats');
        return { avgRating: 0, count: 0, latest: [] };
      }
      return { avgRating: 0, count: 0, latest: [] };
    }

    const ratings = (ratingData ?? [])
      .map(r => r.rating)
      .filter((rating): rating is number => rating !== null);

    const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

    // Get latest reviews - also handle RLS errors gracefully
    const { data: latestData, error: latestError } = await supabaseUserPapers
      .from('user_papers')
      .select('*')
      .eq('paper_id', paperId)
      .not('review', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(3);

    const latest = latestError ? [] : (latestData || []).map(item => ({
      ...item,
      shelf: item.shelf as 'WANT' | 'READING' | 'READ'
    }));

    return {
      avgRating: Number(avg.toFixed(2)),
      count: ratings.length,
      latest
    };
  } catch (error) {
    console.error('Exception in getPaperAggregates:', error);
    // Return default stats on any error to prevent app crashes
    return { avgRating: 0, count: 0, latest: [] };
  }
}

export async function upsertPaper(paper: {
  doi: string;
  title: string;
  abstract?: string;
  year?: number;
  journal?: string;
  meta?: any;
}) {
  const { data, error } = await supabaseUserPapers
    .from('papers')
    .upsert(paper, { onConflict: 'doi' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPaper(id: string) {
  const { data, error } = await supabaseUserPapers
    .from('papers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching paper:', error);
    return null;
  }
  return data;
}

export async function searchPapers(query: string, limit = 20) {
  const { data, error } = await supabaseUserPapers
    .from('papers')
    .select('*')
    .or(`title.ilike.%${query}%,abstract.ilike.%${query}%,journal.ilike.%${query}%`)
    .limit(limit);

  if (error) {
    console.error('Error searching papers:', error);
    return [];
  }
  return data || [];
}

export async function getRecentPapers(limit = 9, offset = 0) {
  // First, get the total count
  const { count: totalCount, error: countError } = await supabaseUserPapers
    .from('papers')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Error fetching total count:', countError);
    return { papers: [], totalCount: 0 };
  }

  // Then get the paginated data
  const { data, error } = await supabaseUserPapers
    .from('papers')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching recent papers:', error);
    return { papers: [], totalCount: 0 };
  }

  return { papers: data || [], totalCount: totalCount || 0 };
}

export async function getTrendingPapers(limit = 12, timePeriod: 'week' | 'month' | 'all' = 'all') {
  // Calculate date filter based on time period
  let dateFilter = null;
  if (timePeriod !== 'all') {
    const now = new Date();
    if (timePeriod === 'week') {
      now.setDate(now.getDate() - 7);
    } else if (timePeriod === 'month') {
      now.setMonth(now.getMonth() - 1);
    }
    dateFilter = now.toISOString();
  }

  try {
    // Build query with optional date filter
    let query = supabaseUserPapers
      .from('user_papers')
      .select(`
        paper_id,
        rating,
        updated_at,
        papers (*)
      `)
      .not('papers', 'is', null)
      .not('rating', 'is', null);

    if (dateFilter) {
      query = query.gte('updated_at', dateFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching trending papers:', error);
      // If RLS blocks access, return empty array instead of failing
      if (error.code === 'PGRST301' || error.message?.includes('Unauthorized')) {
        console.log('JWT auth error, returning empty array');
        return [];
      }
      return [];
    }

    // Group by paper and calculate average rating
    const paperStats = new Map();

    data?.forEach(item => {
      if (!item.papers) return;

      const paperId = item.paper_id;
      const rating = item.rating;

      if (!paperStats.has(paperId)) {
        paperStats.set(paperId, {
          paper: item.papers,
          ratings: [],
          avgRating: 0
        });
      }

      paperStats.get(paperId).ratings.push(rating);
    });

    // Calculate average ratings and sort by highest rating
    const sortedPapers = Array.from(paperStats.values())
      .map(stat => ({
        ...stat.paper,
        avgRating: stat.ratings.reduce((a, b) => a + b, 0) / stat.ratings.length
      }))
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, limit);

    return sortedPapers;
  } catch (error) {
    console.error('Exception in getTrendingPapers:', error);
    // Return empty array on any error to prevent app crashes
    return [];
  }
}