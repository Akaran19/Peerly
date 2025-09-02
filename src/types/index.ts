// Peerly - Academic paper tracking types

export type Shelf = 'WANT' | 'READING' | 'READ';

export interface Paper {
  id: string;
  doi: string;
  title: string;
  abstract?: string;
  year?: number;
  // Enhanced metadata from CrossRef (temporarily optional due to schema sync issues)
  publishedDate?: string; // Full publication date (YYYY-MM-DD)
  journal?: string; // Journal name
  conference?: string; // Conference name
  authors?: string[]; // Full author names
  referencesCount?: number; // Number of references
  citationCount?: number; // Citation count
  publisher?: string; // Publisher name
  type?: string; // Publication type
  pdfUrl?: string; // Direct PDF link
  htmlUrl?: string; // HTML version link
}

export interface Author {
  id: string;
  name: string;
  externalId?: string;
}

export interface Journal {
  id: string;
  name: string;
  issn?: string;
  externalId?: string;
}

export interface User {
  id: string;
  handle: string;
  name: string;
  image?: string;
}

export interface UserPaper {
  id: string;
  user_id: string;
  paper_id: string;
  shelf: Shelf;
  rating?: number;
  review?: string;
  created_at: string;
  updated_at: string;
  upvotes?: number;
}

export interface Activity {
  id: string;
  userId: string;
  type: 'ADDED' | 'RATED' | 'REVIEWED' | 'MOVED_SHELF';
  targetId: string;
  createdAt: string;
}

// UI-specific types
export interface PaperAggregates {
  avgRating: number;
  count: number;
  latest: UserPaper[];
  histogram?: Record<1|2|3|4|5, number>;
}

export interface SearchResult {
  papers: Paper[];
  total: number;
}