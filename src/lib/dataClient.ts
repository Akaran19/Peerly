// Peerly - Data client with Supabase and CrossRef integration

import { Paper, Author, Journal, User, UserPaper, Shelf, PaperAggregates } from '@/types';
import { normalizeDOI } from './doi';
import { supabase } from '@/integrations/supabase/client';
import { getPaperByDOI, multiApiToPaper } from '@/lib/crossref';

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

export const dataClient = {
  async getPaperById(id: string): Promise<Paper | null> {
    try {
      const { data, error } = await supabase
        .from('papers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching paper by ID:', error);
        return null;
      }

      return mapDatabasePaperToPaper(data);
    } catch (error) {
      console.error('Error in getPaperById:', error);
      return null;
    }
  },

  async getPaperByDOI(doi: string): Promise<Paper | null> {
    try {
      const normalizedDOI = normalizeDOI(doi);
      console.log('getPaperByDOI called with:', doi, 'normalized to:', normalizedDOI);
      
      // Try with .single() first
      const { data, error } = await supabase
        .from('papers')
        .select('*')
        .eq('doi', normalizedDOI)
        .single();

      if (error) {
        console.log('Single query failed:', error.message, 'Code:', error.code);
        
        // Fallback to regular query
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('papers')
          .select('*')
          .eq('doi', normalizedDOI)
          .limit(1);

        if (fallbackError) {
          console.log('Fallback query also failed:', fallbackError.message);
          return null;
        }

        if (fallbackData && fallbackData.length > 0) {
          console.log('Fallback query found paper:', fallbackData[0]);
          return mapDatabasePaperToPaper(fallbackData[0]);
        }
        
        console.log('No paper found with DOI:', normalizedDOI);
        return null;
      }

      console.log('Paper found in database:', data);
      return mapDatabasePaperToPaper(data);
    } catch (error) {
      console.error('Error in getPaperByDOI:', error);
      return null;
    }
  },

  async lookupPaperByDOI(doi: string): Promise<Paper | null> {
    try {
      const normalizedDOI = normalizeDOI(doi);
      console.log('lookupPaperByDOI called with:', doi, 'normalized to:', normalizedDOI);

      // First check if paper exists in Supabase
      const existingPaper = await this.getPaperByDOI(normalizedDOI);
      console.log('Existing paper in database:', existingPaper);
      
            // If paper exists but has incomplete data, refetch and update
      if (existingPaper && !existingPaper.abstract) {
        console.log('Paper exists but has incomplete data, refetching from APIs...');
        
        // Fetch fresh data from multiple APIs
        const multiApiPaper = await getPaperByDOI(normalizedDOI);
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
            console.log(`Successfully updated paper with fresh data: ${updatedPaper.title}`);
            return mapDatabasePaperToPaper(updatedPaper);
          }
        }
      } else if (existingPaper) {
        return existingPaper;
      }

      // Check if user is authenticated before trying to insert
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('Current user:', user, 'Auth error:', authError);
      
      if (authError || !user) {
        console.error('User not authenticated, cannot insert paper');
        throw new Error('You must be logged in to add papers to the database');
      }

      // If not found, fetch from multiple APIs
      console.log(`Fetching paper ${normalizedDOI} from multiple APIs...`);
      
      // Add a small delay to prevent rapid retries that hit rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const multiApiPaper = await getPaperByDOI(normalizedDOI);
      console.log('Multi-API response:', multiApiPaper);
      if (!multiApiPaper || !multiApiPaper.title) {
        console.log(`Paper ${normalizedDOI} not found in any API`);
        return null;
      }

      // Convert and insert to Supabase with all available metadata
      const paperData = multiApiToPaper(multiApiPaper);
      console.log('Converted paper data:', paperData);

      // Try insert first, if it fails due to duplicate, try update
      try {
        const { data: newPaper, error } = await supabase
          .from('papers')
          .insert(mapPaperToDatabase(paperData))
          .select()
          .single();

        if (error) {
          // Check if it's a duplicate key error (DOI already exists)
          if (error.code === '23505' && error.message.includes('papers_doi_key')) {
            console.log('Paper with DOI already exists, updating instead...');
            // If insert fails due to duplicate DOI, try update
            const { data: updatedPaper, error: updateError } = await supabase
              .from('papers')
              .update(mapPaperToDatabase(paperData))
              .eq('doi', normalizedDOI)
              .select()
              .single();

            if (updateError) {
              console.error('Update also failed:', updateError);
              return null;
            }

            console.log(`Successfully updated existing paper: ${updatedPaper.title}`);
            return mapDatabasePaperToPaper(updatedPaper);
          } else {
            // Some other error occurred during insert
            console.error('Insert failed with unexpected error:', error);
            return null;
          }
        }

        console.log(`Successfully inserted new paper: ${newPaper.title}`);
        return mapDatabasePaperToPaper(newPaper);
      } catch (insertError) {
        console.error('Insert/update failed:', insertError);
        return null;
      }
    } catch (error) {
      console.error('Error in lookupPaperByDOI:', error);
      return null;
    }
  },

  async keywordSearchPapers(query: string): Promise<Paper[]> {
    try {
      const { data, error } = await supabase
        .from('papers')
        .select('*')
        .or(`title.ilike.%${query}%,abstract.ilike.%${query}%,journal.ilike.%${query}%,conference.ilike.%${query}%`)
        .limit(20);

      if (error) {
        console.error('Error searching papers:', error);
        return [];
      }
      return (data || []).map(mapDatabasePaperToPaper);
    } catch (error) {
      console.error('Error in keywordSearchPapers:', error);
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
        console.error('Error listing papers by author:', error);
        return [];
      }
      return (data || []).map(mapDatabasePaperToPaper);
    } catch (error) {
      console.error('Error in listPapersByAuthor:', error);
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
        console.error('Error listing papers by journal:', error);
        return [];
      }
      return (data || []).map(mapDatabasePaperToPaper);
    } catch (error) {
      console.error('Error in listPapersByJournal:', error);
      return [];
    }
  },

  async getAuthor(id: string): Promise<Author | null> {
    try {
      // Authors are now stored as strings in the authors array
      // This function is kept for backward compatibility but may not be used
      console.warn('getAuthor is deprecated - authors are now stored as strings in papers.authors');
      return null;
    } catch (error) {
      console.error('Error in getAuthor:', error);
      return null;
    }
  },

  async getJournal(id: string): Promise<Journal | null> {
    try {
      // Journals are now stored as strings in papers.journal
      // This function is kept for backward compatibility but may not be used
      console.warn('getJournal is deprecated - journals are now stored as strings in papers.journal');
      return null;
    } catch (error) {
      console.error('Error in getJournal:', error);
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
        console.error('Error fetching user by handle:', error);
        return null;
      }
      return data as unknown as User;
    } catch (error) {
      console.error('Error in getUserByHandle:', error);
      return null;
    }
  },

  async listUserPapers(userId: string, shelf?: Shelf): Promise<UserPaper[]> {
    try {
      let query = supabase
        .from('user_papers')
        .select('*')
        .eq('user_id', userId);

      if (shelf) {
        query = query.eq('shelf', shelf);
      }

      const { data, error } = await query
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error listing user papers:', error);
        return [];
      }
      return (data || []) as unknown as UserPaper[];
    } catch (error) {
      console.error('Error in listUserPapers:', error);
      return [];
    }
  },

  async upsertUserPaper(input: Partial<UserPaper> & { userId: string; paperId: string }): Promise<UserPaper> {
    try {
      const { data, error } = await supabase
        .from('user_papers')
        .upsert({
          user_id: input.userId,
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
        throw error;
      }
      return data as unknown as UserPaper;
    } catch (error) {
      console.error('Error in upsertUserPaper:', error);
      throw error;
    }
  },

  async getAggregatesForPaper(paperId: string): Promise<PaperAggregates & { histogram: Record<1|2|3|4|5, number> }> {
    try {
      const { data, error } = await supabase
        .from('user_papers')
        .select('rating')
        .eq('paper_id', paperId);

      if (error) {
        console.error('Error fetching paper aggregates:', error);
        return { avgRating: 0, count: 0, latest: [], histogram: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0} };
      }

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

      // Get latest user papers for this paper
      const { data: latestData, error: latestError } = await supabase
        .from('user_papers')
        .select('*')
        .eq('paper_id', paperId)
        .order('updated_at', { ascending: false })
        .limit(3);

      const latest = latestError ? [] : (latestData || []) as unknown as UserPaper[];

      return {
        avgRating: Number(avg.toFixed(2)),
        count: ratings.length,
        latest,
        histogram
      };
    } catch (error) {
      console.error('Error in getAggregatesForPaper:', error);
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
      console.error('Error in getTopReviewsForPaper:', error);
      return [];
    }
  },

  // Helper to get current user for UI components
  getCurrentUser(): User {
    // This is a synchronous helper that should be replaced with proper auth
    console.warn('getCurrentUser is deprecated - use proper auth context');
    return {
      id: '1',
      handle: 'user',
      name: 'User',
      image: undefined
    };
  },

  async getCurrentUserPaper(paperId: string): Promise<UserPaper | null> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) return null;

      const { data, error } = await supabase
        .from('user_papers')
        .select('*')
        .eq('user_id', userId)
        .eq('paper_id', paperId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching current user paper:', error);
        return null;
      }
      return data as unknown as UserPaper;
    } catch (error) {
      console.error('Error in getCurrentUserPaper:', error);
      return null;
    }
  },

  async getCurrentUserId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id ?? null;
    } catch (error) {
      console.error('Error getting current user ID:', error);
      return null;
    }
  }
};