import { supabase } from '@/integrations/supabase/client';
import { GuestStorage } from './guestStorage';

// Helper to check if user is in guest mode
function isGuestMode() {
  return localStorage.getItem('peerly_guest_mode') === 'true';
}

export async function getCurrentUserId() {
  if (isGuestMode()) {
    return 'guest-user';
  }
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function getCurrentUserProfile() {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data, error } = await supabase
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
}) {
  if (isGuestMode()) {
    return GuestStorage.upsertUserPaper(input.paper_id, {
      shelf: input.shelf,
      rating: input.rating,
      review: input.review
    });
  }

  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('user_papers')
    .upsert({ 
      user_id: userId, 
      ...input 
    }, { 
      onConflict: 'user_id,paper_id' 
    })
    .select()
    .single();

  if (error) throw error;
  return data as any; // Cast to match UserPaper type
}

export async function getUserPaper(paperId: string) {
  if (isGuestMode()) {
    return GuestStorage.getUserPaper(paperId);
  }

  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from('user_papers')
    .select('*')
    .eq('user_id', userId)
    .eq('paper_id', paperId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user paper:', error);
    return null;
  }
  return data as any; // Cast to match UserPaper type
}

export async function getUserPapers(userId: string, shelf?: 'WANT' | 'READING' | 'READ') {
  if (isGuestMode()) {
    if (shelf) {
      return GuestStorage.getUserPapersByShelf(shelf);
    }
    return GuestStorage.getUserPapers();
  }

  let query = supabase
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
    return [];
  }
  return data || [];
}

export async function getPaperAggregates(paperId: string) {
  // Get ratings
  const { data: ratingData, error: ratingError } = await supabase
    .from('user_papers')
    .select('rating')
    .eq('paper_id', paperId);

  if (ratingError) {
    console.error('Error fetching paper aggregates:', ratingError);
    return { avgRating: 0, count: 0, latest: [] };
  }

  const ratings = (ratingData ?? [])
    .map(r => r.rating)
    .filter((rating): rating is number => rating !== null);
  
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  // Get latest reviews
  const { data: latestData, error: latestError } = await supabase
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
}

export async function upsertPaper(paper: {
  doi: string;
  title: string;
  abstract?: string;
  year?: number;
  journal?: string;
  meta?: any;
}) {
  const { data, error } = await supabase
    .from('papers')
    .upsert(paper, { onConflict: 'doi' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPaper(id: string) {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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

export async function getRecentPapers(limit = 20) {
  const { data, error } = await supabase
    .from('papers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent papers:', error);
    return [];
  }
  return data || [];
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

  // Build query with optional date filter
  let query = supabase
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
}