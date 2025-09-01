import { supabase } from '@/integrations/supabase/client';

export async function getCurrentUserId() {
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
  const { data, error } = await supabase
    .from('user_papers')
    .select('rating')
    .eq('paper_id', paperId);

  if (error) {
    console.error('Error fetching paper aggregates:', error);
    return { avgRating: 0, count: 0 };
  }

  const ratings = (data ?? [])
    .map(r => r.rating)
    .filter((rating): rating is number => rating !== null);
  
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  return { 
    avgRating: Number(avg.toFixed(2)), 
    count: ratings.length 
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

export async function getTrendingPapers(limit = 20) {
  // For now, get papers with the most user interactions
  const { data, error } = await supabase
    .from('user_papers')
    .select(`
      paper_id,
      papers (
        id,
        title,
        abstract,
        year,
        journal,
        doi,
        created_at
      )
    `)
    .not('papers', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit * 2); // Get more to account for duplicates

  if (error) {
    console.error('Error fetching trending papers:', error);
    return [];
  }

  // Remove duplicates and extract papers
  const uniquePapers = new Map();
  data?.forEach(item => {
    if (item.papers && !uniquePapers.has(item.papers.id)) {
      uniquePapers.set(item.papers.id, item.papers);
    }
  });

  return Array.from(uniquePapers.values()).slice(0, limit);
}