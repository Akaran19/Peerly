// Peerly - Data client with Supabase and CrossRef integration

import { Paper, Author, Journal, User, UserPaper, Shelf, PaperAggregates } from '@/types';
import { normalizeDOI, decodeDOIFromUrl } from './doi';
import { supabase } from '@/integrations/supabase/client';
import { getPaperByDOI, multiApiToPaper, searchPapersByKeywords, getPaperByPMID } from '@/lib/crossref';
import { GuestStorage } from './guestStorage';

// Global flag to track guest mode (will be set by auth context)
let isGuestMode = false;

export function setGuestMode(guest: boolean) {
  isGuestMode = guest;
}

// Helper function to convert database row (snake_case) to TypeScript interface (camelCase)
export function mapDatabasePaperToPaper(dbPaper: any): Paper {
  return {
    id: dbPaper.id,
    doi: dbPaper.doi,
    title: dbPaper.title,
    abstract: dbPaper.abstract,
    year: dbPaper.year,
    publishedDate: dbPaper.published_date,
    journal: dbPaper.journal,
    conference: dbPaper.conference,
    authors: dbPaper.authors,
    referencesCount: dbPaper.references_count,
    citationCount: dbPaper.citation_count,
    publisher: dbPaper.publisher,
    type: dbPaper.type,
    pdfUrl: dbPaper.pdf_url,
    htmlUrl: dbPaper.html_url
  };
}

// Helper function to convert TypeScript Paper object (camelCase) to database format (snake_case)
function mapPaperToDatabase(paper: Omit<Paper, 'id'>): any {
  return {
    doi: paper.doi,
    title: paper.title,
    abstract: paper.abstract,
    year: paper.year,
    published_date: paper.publishedDate,
    journal: paper.journal,
    conference: paper.conference,
    authors: paper.authors,
    references_count: paper.referencesCount,
    citation_count: paper.citationCount,
    publisher: paper.publisher,
    type: paper.type,
    pdf_url: paper.pdfUrl,
    html_url: paper.htmlUrl
  };
}

// Global cache for API call timestamps to prevent rapid successive calls
const apiCallCache = new Map<string, number>();
// Global rate limit tracker for dataClient
let lastDataClientApiCallTime = 0;
const MIN_DATA_CLIENT_API_INTERVAL = 3000; // 3 seconds between any API calls in dataClient

export const dataClient = {
  async getPaperById(id: string): Promise<Paper | null> {
    try {
      const { data, error } = await supabase
        .from('papers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return null;
      }

      return mapDatabasePaperToPaper(data);
    } catch (error) {
      return null;
    }
  },

  async getPaperByDOI(doi: string): Promise<Paper | null> {
    try {
      const normalizedDOI = normalizeDOI(doi);
      
      // Use limit(1) instead of .single() to avoid 406 errors when no rows found
      const { data, error } = await supabase
        .from('papers')
        .select('*')
        .eq('doi', normalizedDOI)
        .limit(1);

      if (error) {
        console.error('Error querying papers:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      return mapDatabasePaperToPaper(data[0]);
    } catch (error) {
      console.error('Exception in getPaperByDOI:', error);
      return null;
    }
  },

  async lookupPaperByDOI(doi: string): Promise<Paper | null> {
    console.log('dataClient: lookupPaperByDOI called with', doi);
    try {
      const normalizedDOI = normalizeDOI(doi);
      console.log('dataClient: Looking up DOI', normalizedDOI);

      // Check if we recently made an API call for this DOI
      const lastCallTime = apiCallCache.get(normalizedDOI);
      const now = Date.now();
      if (lastCallTime && (now - lastCallTime) < 30000) { // 30 second cooldown
        console.log('dataClient: API call too recent, using cached data only');
        const existingPaper = await this.getPaperByDOI(normalizedDOI);
        return existingPaper;
      }

      // First check if paper exists in Supabase
      const existingPaper = await this.getPaperByDOI(normalizedDOI);
      console.log('dataClient: Existing paper in DB', existingPaper);
      
      // If paper exists and has basic data (title), don't make API calls unless explicitly requested
      // Only refresh if the paper is very old (7+ days) or missing critical data
      if (existingPaper && existingPaper.title) {
        const paperAge = existingPaper.created_at ? 
          Date.now() - new Date(existingPaper.created_at).getTime() : Infinity;
        
        // Only refresh if older than 7 days AND missing abstract
        const shouldRefresh = paperAge > (7 * 24 * 60 * 60 * 1000) && !existingPaper.abstract;
        
        if (!shouldRefresh) {
          console.log('dataClient: Returning existing paper (recent or has title)');
          return existingPaper;
        }
        
        console.log('dataClient: Paper exists but is old and missing abstract, refreshing data');
        
        // Check if we recently made an API call for this DOI
        const lastCallTime = apiCallCache.get(normalizedDOI);
        const now = Date.now();
        if (lastCallTime && (now - lastCallTime) < 30000) { // 30 second cooldown
          console.log('dataClient: API call too recent, using cached data only');
          return existingPaper;
        }
        
        // Update cache timestamp
        apiCallCache.set(normalizedDOI, now);
        
        // Fetch fresh data from multiple APIs
        const multiApiPaper = await getPaperByDOI(normalizedDOI);
        console.log('dataClient: Fresh API data', multiApiPaper);
        if (multiApiPaper && multiApiPaper.title) {
          const updatedPaperData = multiApiToPaper(multiApiPaper);
          
          // Update the existing paper with fresh data
          const { data: updatedPaper, error: updateError } = await supabase
            .from('papers')
            .update(mapPaperToDatabase(updatedPaperData))
            .eq('doi', normalizedDOI)
            .select()
            .single();

          if (!updateError && updatedPaper) {
            return mapDatabasePaperToPaper(updatedPaper);
          }
        }
        
        // If API call failed or returned no data, return existing paper
        console.log('dataClient: API refresh failed, returning existing paper');
        return existingPaper;
      }

      // If not found, fetch from multiple APIs
      console.log('dataClient: Fetching from APIs');
      
      // Update cache timestamp (already checked above)
      apiCallCache.set(normalizedDOI, now);
      
      // Add a small delay to prevent rapid retries that hit rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const multiApiPaper = await getPaperByDOI(normalizedDOI);
      console.log('dataClient: API result', multiApiPaper);
      if (!multiApiPaper || !multiApiPaper.title) {
        console.log('dataClient: No valid paper data from APIs');
        return null;
      }

      // Convert to paper format
      const paperData = multiApiToPaper(multiApiPaper);
      console.log('dataClient: Converted paper data', paperData);

      // Try to insert the paper - if it fails due to auth, return guest paper
      try {
        const { data: newPaper, error } = await supabase
          .from('papers')
          .insert(mapPaperToDatabase(paperData))
          .select()
          .single();

        if (error) {
          // Check if it's an auth error (401/403) or duplicate key error
          if (error.code === '23505' && error.message.includes('papers_doi_key')) {
            // If insert fails due to duplicate DOI, try update
            const { data: updatedPaper, error: updateError } = await supabase
              .from('papers')
              .update(mapPaperToDatabase(paperData))
              .eq('doi', normalizedDOI)
              .select()
              .single();

            if (updateError) {
              // If update also fails due to auth, return guest paper
              if (updateError.code === 'PGRST301' || updateError.message?.includes('Unauthorized')) {
                console.log('dataClient: Auth error on update, returning guest paper');
                const guestPaper = {
                  ...paperData,
                  id: `guest-${normalizedDOI.replace(/[^a-zA-Z0-9]/g, '-')}`
                };
                return guestPaper;
              }
              console.log('dataClient: Update error', updateError);
              return null;
            }

            console.log('dataClient: Updated existing paper');
            return mapDatabasePaperToPaper(updatedPaper);
          } else if (error.code === 'PGRST301' || error.message?.includes('Unauthorized')) {
            // Auth error - return guest paper
            console.log('dataClient: Auth error on insert, returning guest paper');
            const guestPaper = {
              ...paperData,
              id: `guest-${normalizedDOI.replace(/[^a-zA-Z0-9]/g, '-')}`
            };
            return guestPaper;
          } else {
            // Some other error occurred during insert
            console.log('dataClient: Insert error', error);
            return null;
          }
        }

        console.log('dataClient: Inserted new paper', newPaper);
        return mapDatabasePaperToPaper(newPaper);
      } catch (insertError: any) {
        // If insert fails due to auth, return guest paper
        if (insertError.code === 'PGRST301' || insertError.message?.includes('Unauthorized')) {
          console.log('dataClient: Auth error in insert exception, returning guest paper');
          const guestPaper = {
            ...paperData,
            id: `guest-${normalizedDOI.replace(/[^a-zA-Z0-9]/g, '-')}`
          };
          return guestPaper;
        }
        console.log('dataClient: Insert exception', insertError);
        return null;
      }
    } catch (error) {
      console.log('dataClient: Lookup exception', error);
      return null;
    }
  },

  async lookupPaperByPMID(pmid: string): Promise<Paper | null> {
    try {
      // First check if paper exists in Supabase by searching for PMID in DOI field
      const { data: existingPapers, error } = await supabase
        .from('papers')
        .select('*')
        .ilike('doi', `%${pmid}%`)
        .limit(1);

      if (!error && existingPapers && existingPapers.length > 0) {
        return mapDatabasePaperToPaper(existingPapers[0]);
      }

      // If not found, fetch from PubMed API
      const multiApiPaper = await getPaperByPMID(pmid);
      if (!multiApiPaper || !multiApiPaper.title) {
        return null;
      }

      // Convert to paper format
      const paperData = multiApiToPaper(multiApiPaper);

      // Try to insert the paper - if it fails due to auth, return guest paper
      try {
        const { data: newPaper, error } = await supabase
          .from('papers')
          .insert(mapPaperToDatabase(paperData))
          .select()
          .single();

        if (error) {
          // Check if it's a duplicate key error
          if (error.code === '23505') {
            // If insert fails due to duplicate, try update
            const { data: updatedPaper, error: updateError } = await supabase
              .from('papers')
              .update(mapPaperToDatabase(paperData))
              .ilike('doi', `%${pmid}%`)
              .select()
              .single();

            if (updateError) {
              // If update also fails due to auth, return guest paper
              if (updateError.code === 'PGRST301' || updateError.message?.includes('Unauthorized')) {
                console.log('dataClient: Auth error on PMID update, returning guest paper');
                return {
                  ...paperData,
                  id: `guest-pmid-${pmid}`
                };
              }
              return null;
            }

            return mapDatabasePaperToPaper(updatedPaper);
          } else if (error.code === 'PGRST301' || error.message?.includes('Unauthorized')) {
            // Auth error - return guest paper
            console.log('dataClient: Auth error on PMID insert, returning guest paper');
            return {
              ...paperData,
              id: `guest-pmid-${pmid}`
            };
          } else {
            return null;
          }
        }

        return mapDatabasePaperToPaper(newPaper);
      } catch (insertError: any) {
        // If insert fails due to auth, return guest paper
        if (insertError.code === 'PGRST301' || insertError.message?.includes('Unauthorized')) {
          console.log('dataClient: Auth error in PMID insert exception, returning guest paper');
          return {
            ...paperData,
            id: `guest-pmid-${pmid}`
          };
        }
        return null;
      }
    } catch (error) {
      return null;
    }
  },

  async keywordSearchPapers(query: string): Promise<Paper[]> {
    try {
      // First, search the local database
      const { data: localData, error: localError } = await supabase
        .from('papers')
        .select('*')
        .or(`title.ilike.%${query}%,abstract.ilike.%${query}%,journal.ilike.%${query}%,conference.ilike.%${query}%`)
        .limit(10); // Get fewer from local to leave room for web results

      const localPapers = localError ? [] : (localData || []).map(mapDatabasePaperToPaper);

      // If we have enough local results, return them
      if (localPapers.length >= 10) {
        return localPapers.slice(0, 20);
      }

      // Otherwise, also search the web for additional results
      try {
        const webResults = await searchPapersByKeywords(query, 15);

        // Convert web results to Paper format and filter out duplicates
        const webPapers: Paper[] = [];
        const seenDois = new Set(localPapers.map(p => p.doi));

        for (const webPaper of webResults) {
          if (!seenDois.has(webPaper.doi)) {
            // Convert to paper format but DON'T save to database yet
            const paperData = multiApiToPaper(webPaper);

            // Add to results with temporary web ID (will be saved when user clicks into it)
            webPapers.push({
              ...paperData,
              id: `web-${webPaper.doi.replace(/[^a-zA-Z0-9]/g, '-')}` // Temporary ID for web results
            });

            seenDois.add(webPaper.doi);
          }
        }

        // Combine local and web results
        const combinedResults = [...localPapers, ...webPapers];

        // Sort combined results by citation count in descending order
        combinedResults.sort((a, b) => {
          const aCitations = a.citationCount || 0;
          const bCitations = b.citationCount || 0;
          return bCitations - aCitations;
        });

        return combinedResults.slice(0, 20);

      } catch (webError) {
        console.error('Web search failed, returning local results only:', webError);
        return localPapers;
      }
    } catch (error) {
      return [];
    }
  },

  async listPapersByAuthor(authorId: string): Promise<Paper[]> {
    try {
      // For now, search by author name in the authors array
      const { data, error } = await supabase
        .from('papers')
        .select('*')
        .contains('authors', [authorId]);

      if (error) {
        return [];
      }
      return (data || []).map(mapDatabasePaperToPaper);
    } catch (error) {
      return [];
    }
  },

  async listPapersByJournal(journalId: string): Promise<Paper[]> {
    try {
      const { data, error } = await supabase
        .from('papers')
        .select('*')
        .eq('journal', journalId);

      if (error) {
        return [];
      }
      return (data || []).map(mapDatabasePaperToPaper);
    } catch (error) {
      return [];
    }
  },

  async getAuthor(id: string): Promise<Author | null> {
    try {
      // Authors are now stored as strings in the authors array
      // This function is kept for backward compatibility but may not be used
      return null;
    } catch (error) {
      return null;
    }
  },

  async getJournal(id: string): Promise<Journal | null> {
    try {
      // Journals are now stored as strings in papers.journal
      // This function is kept for backward compatibility but may not be used
      return null;
    } catch (error) {
      return null;
    }
  },

  async getUserByHandle(handle: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('handle', handle)
        .single();

      if (error) {
        return null;
      }
      return data as unknown as User;
    } catch (error) {
      return null;
    }
  },

  async listUserPapers(userId: string, shelf?: Shelf): Promise<UserPaper[]> {
    if (isGuestMode) {
      if (shelf) {
        return GuestStorage.getUserPapersByShelf(shelf);
      }
      return GuestStorage.getUserPapers();
    }

    // Get the database profile ID from Clerk user ID
    const { getCurrentUserId } = await import('./supabaseHelpers');
    const dbUserId = await getCurrentUserId(userId);
    if (!dbUserId) {
      return [];
    }

    try {
      let query = supabase
        .from('user_papers')
        .select('*')
        .eq('user_id', dbUserId);

      if (shelf) {
        query = query.eq('shelf', shelf);
      }

      const { data, error } = await query
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error listing user papers:', error);
        // If RLS blocks access, return empty array instead of failing
        if (error.code === 'PGRST301' || error.message?.includes('Unauthorized')) {
          console.log('RLS blocking access to user_papers for listing, returning empty array');
          return [];
        }
        return [];
      }
      return (data || []) as unknown as UserPaper[];
    } catch (error) {
      console.error('Exception in listUserPapers:', error);
      // Return empty array on any error to prevent app crashes
      return [];
    }
  },

  async upsertUserPaper(input: Partial<UserPaper> & { userId: string; paperId: string }): Promise<UserPaper> {
    // Handle guest paper IDs for authenticated users
    if (input.paperId.startsWith('guest-') && !isGuestMode) {
      try {
        // Extract DOI from guest ID
        const guestPrefix = 'guest-';
        const encodedDoi = input.paperId.slice(guestPrefix.length);
        const doi = decodeDOIFromUrl(encodedDoi);

        // Ensure the paper exists in database
        const realPaper = await this.lookupPaperByDOI(doi);
        if (realPaper) {
          // Use the real paper ID
          input.paperId = realPaper.id;
        } else {
          // Fallback to GuestStorage if lookup fails
          return GuestStorage.upsertUserPaper(input.paperId, {
            shelf: input.shelf,
            rating: input.rating,
            review: input.review
          });
        }
      } catch (error) {
        console.error('Error converting guest paper to real paper:', error);
        // Fallback to GuestStorage
        return GuestStorage.upsertUserPaper(input.paperId, {
          shelf: input.shelf,
          rating: input.rating,
          review: input.review
        });
      }
    }

    // If in guest mode or still guest paper, use GuestStorage
    if (isGuestMode || input.paperId.startsWith('guest-')) {
      return GuestStorage.upsertUserPaper(input.paperId, {
        shelf: input.shelf,
        rating: input.rating,
        review: input.review
      });
    }

    // Get the database profile ID from Clerk user ID
    const { getCurrentUserId } = await import('./supabaseHelpers');
    const dbUserId = await getCurrentUserId(input.userId);
    if (!dbUserId) {
      throw new Error('Unable to get user profile ID');
    }

    try {
      const { data, error } = await supabase
        .from('user_papers')
        .upsert({
          user_id: dbUserId,
          paper_id: input.paperId,
          shelf: input.shelf || 'WANT',
          rating: input.rating || null,
          review: input.review || null
        }, {
          onConflict: 'user_id,paper_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Error upserting user paper:', error);
        // If RLS blocks access, throw a more specific error
        if (error.code === 'PGRST301' || error.message?.includes('Unauthorized')) {
          console.log('RLS blocking access to user_papers for upsert, throwing specific error');
          throw new Error('Unable to save paper changes due to authentication issues. Please try refreshing the page.');
        }
        throw error;
      }
      return data as unknown as UserPaper;
    } catch (error) {
      console.error('Exception in upsertUserPaper:', error);
      // Re-throw the error so the UI can handle it appropriately
      throw error;
    }
  },

  async getAggregatesForPaper(paperId: string): Promise<PaperAggregates & { histogram: Record<1|2|3|4|5, number> }> {
    console.log('getAggregatesForPaper: Starting for paperId:', paperId);

    // Handle guest paper IDs for authenticated users
    if (paperId.startsWith('guest-') && !isGuestMode) {
      try {
        // Extract DOI from guest ID
        const guestPrefix = 'guest-';
        const encodedDoi = paperId.slice(guestPrefix.length);
        const doi = decodeDOIFromUrl(encodedDoi);

        // Ensure the paper exists in database
        const realPaper = await this.lookupPaperByDOI(doi);
        if (realPaper) {
          // Use the real paper ID
          paperId = realPaper.id;
        } else {
          // Fallback to default stats
          return { avgRating: 0, count: 0, latest: [], histogram: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0} };
        }
      } catch (error) {
        console.error('Error converting guest paper to real paper:', error);
        return { avgRating: 0, count: 0, latest: [], histogram: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0} };
      }
    }

    // For guest papers, return default stats since they're not in the database
    if (paperId.startsWith('guest-')) {
      return { avgRating: 0, count: 0, latest: [], histogram: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0} };
    }

    try {
      console.log('getAggregatesForPaper: Executing first query for ratings');
      const { data, error } = await supabase
        .from('user_papers')
        .select('rating')
        .eq('paper_id', paperId);

      if (error) {
        console.error('Error fetching paper aggregates:', error);
        // If RLS blocks access, return default stats instead of failing
        if (error.code === 'PGRST301' || error.message?.includes('Unauthorized')) {
          console.log('RLS blocking access to user_papers, returning default stats');
          return { avgRating: 0, count: 0, latest: [], histogram: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0} };
        }
        return { avgRating: 0, count: 0, latest: [], histogram: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0} };
      }

      console.log('getAggregatesForPaper: First query completed, data:', data);

      const ratings = (data ?? [])
        .map(r => r.rating)
        .filter((rating): rating is number => rating !== null);

      const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

      // Create histogram
      const histogram: Record<1|2|3|4|5, number> = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
      ratings.forEach(rating => {
        if (rating >= 1 && rating <= 5) {
          histogram[rating as 1|2|3|4|5]++;
        }
      });

      console.log('getAggregatesForPaper: Executing second query for latest reviews');

      // Get latest user papers for this paper - also handle RLS errors gracefully
      const { data: latestData, error: latestError } = await supabase
        .from('user_papers')
        .select('*')
        .eq('paper_id', paperId)
        .order('updated_at', { ascending: false })
        .limit(3);

      console.log('getAggregatesForPaper: Second query completed, latestData:', latestData, 'error:', latestError);

      const latest = latestError ? [] : (latestData || []) as unknown as UserPaper[];

      const result = {
        avgRating: Number(avg.toFixed(2)),
        count: ratings.length,
        latest,
        histogram
      };

      console.log('getAggregatesForPaper: Returning result:', result);
      return result;

    } catch (error) {
      console.error('Exception in getAggregatesForPaper:', error);
      // Return default stats on any error to prevent app crashes
      return { avgRating: 0, count: 0, latest: [], histogram: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0} };
    }
  },

  async getTopReviewsForPaper(paperId: string, limit = 3): Promise<Array<UserPaper & { user: User }>> {
    try {
      const { data, error } = await supabase
        .from('user_papers')
        .select(`
          *,
          profiles:user_id (
            id,
            handle,
            name,
            image
          )
        `)
        .eq('paper_id', paperId)
        .not('review', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching top reviews:', error);
        // If RLS blocks access, return empty array instead of failing
        if (error.code === 'PGRST301' || error.message?.includes('Unauthorized')) {
          console.log('RLS blocking access to user_papers for top reviews, returning empty array');
          return [];
        }
        return [];
      }

      // Transform the data to match the expected format
      return (data || []).map(item => ({
        ...item,
        user: item.profiles ? {
          id: item.profiles.id,
          handle: item.profiles.handle,
          name: item.profiles.name,
          image: item.profiles.image
        } : {
          id: item.user_id,
          handle: 'Anonymous',
          name: 'Anonymous',
          image: undefined
        }
      })) as Array<UserPaper & { user: User }>;
    } catch (error) {
      console.error('Exception in getTopReviewsForPaper:', error);
      // Return empty array on any error to prevent app crashes
      return [];
    }
  },

  // Helper to get current user for UI components
  getCurrentUser(): User {
    // This is a synchronous helper that should be replaced with proper auth
    return {
      id: '1',
      handle: 'user',
      name: 'User',
      image: undefined
    };
  },

  async getCurrentUserPaper(paperId: string, userId: string): Promise<UserPaper | null> {
    // Handle guest paper IDs for authenticated users
    if (paperId.startsWith('guest-') && !isGuestMode) {
      try {
        // Extract DOI from guest ID
        const guestPrefix = 'guest-';
        const encodedDoi = paperId.slice(guestPrefix.length);
        const doi = decodeDOIFromUrl(encodedDoi);

        // Ensure the paper exists in database
        const realPaper = await this.lookupPaperByDOI(doi);
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

    if (isGuestMode || paperId.startsWith('guest-')) {
      return GuestStorage.getUserPaper(paperId);
    }

    // Get the database profile ID from Clerk user ID
    const { getCurrentUserId } = await import('./supabaseHelpers');
    const dbUserId = await getCurrentUserId(userId);
    if (!dbUserId) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('user_papers')
        .select('*')
        .eq('user_id', dbUserId)
        .eq('paper_id', paperId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching current user paper:', error);
        // If RLS blocks access, return null instead of failing
        if (error.code === 'PGRST301' || error.message?.includes('Unauthorized')) {
          console.log('RLS blocking access to user_papers for current user paper, returning null');
          return null;
        }
        return null;
      }
      return data as unknown as UserPaper;
    } catch (error) {
      console.error('Exception in getCurrentUserPaper:', error);
      // Return null on any error to prevent app crashes
      return null;
    }
  },

  async getCurrentUserId(): Promise<string | null> {
    if (isGuestMode) {
      return 'guest-user';
    }

    // This method is deprecated - user ID should be passed directly to methods
    return null;
  }
};