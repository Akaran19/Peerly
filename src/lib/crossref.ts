// Multi-API paper metadata fetching with cascading fallback
// Primary: OpenAlex → CrossRef → Semantic Scholar → Europe PMC → OpenCitations
// Based on: https://api.openalex.org/, https://api.crossref.org/, https://api.semanticscholar.org/

import { Paper } from '@/types';

// Enhanced author interface
export interface Author {
  given?: string;
  family?: string;
  name?: string;
}

// Enhanced paper interface for multi-API results
export interface MultiApiPaper {
  doi: string;
  title?: string;
  authors?: Author[];
  abstract?: string;
  citationCount?: number;
  citingDois?: string[];
  sources: string[]; // which APIs contributed
  year?: number;
  journal?: string;
  conference?: string;
  publishedDate?: string;
  publisher?: string;
  type?: string;
  pdfUrl?: string;
  htmlUrl?: string;
  referencesCount?: number;
}

// Interface for display metadata (with authors as strings)
export interface DisplayPaperMetadata {
  doi: string;
  title?: string;
  authors?: string[];
  abstract?: string;
  citationCount?: number;
  citingDois?: string[];
  sources: string[];
  year?: number;
  journal?: string;
  conference?: string;
  publishedDate?: string;
  publisher?: string;
  type?: string;
  pdfUrl?: string;
  htmlUrl?: string;
  referencesCount?: number;
}

// OpenAlex work interface
interface OpenAlexWork {
  title?: string;
  authorships?: Array<{
    author?: {
      display_name?: string;
    };
  }>;
  abstract_inverted_index?: Record<string, number[]>;
  cited_by_count?: number;
  publication_year?: number;
  primary_location?: {
    source?: {
      display_name?: string;
      type?: string;
    };
  };
  type?: string;
  publisher?: string;
  doi?: string;
}

// CrossRef paper interface
interface CrossRefPaper {
  DOI?: string;
  title?: string[];
  author?: Array<{
    given?: string;
    family?: string;
    name?: string;
  }>;
  published?: {
    'date-parts'?: number[][];
  };
  'container-title'?: string[];
  publisher?: string;
  type?: string;
  abstract?: string;
  'is-referenced-by-count'?: number;
  'references-count'?: number;
  link?: Array<{
    URL: string;
    'content-type': string;
  }>;
}

// Semantic Scholar paper interface
interface SemanticScholarPaper {
  title?: string;
  abstract?: string;
  authors?: Array<{
    name?: string;
  }>;
  citationCount?: number;
  citations?: Array<{
    externalIds?: {
      DOI?: string;
    };
  }>;
  year?: number;
  venue?: string;
  url?: string;
  openAccessPdf?: {
    url: string;
  };
}

// Europe PMC result interface
interface EuropePMCResult {
  abstractText?: string;
}

// OpenCitations citation interface
interface OpenCitationsCitation {
  citing: string;
}

// Configuration
const UA = "PaperLog/1.0 (mailto:contact@example.com)";
const S2_API_KEY = import.meta.env.VITE_S2_API_KEY || "";

// Utility functions
function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function normalizeAuthors(auths: any[]): Author[] {
  return auths
    .map(a => {
      if (a?.name) return { name: a.name };
      const given = a?.given || a?.givenName || a?.given_name;
      const family = a?.family || a?.familyName || a?.family_name;
      const name = [given, family].filter(Boolean).join(" ") || a?.display_name;
      return { given, family, name: name || undefined };
    })
    .filter(Boolean);
}

// Reconstruct OpenAlex abstract from the inverted index
function reconstructOpenAlexAbstract(idx?: Record<string, number[]>): string | undefined {
  if (!idx) return undefined;
  const entries = Object.entries(idx).flatMap(([word, positions]) => positions.map(p => [p, word] as const));
  entries.sort((a, b) => a[0] - b[0]);
  return entries.map(([, w]) => w).join(" ");
}

// Extract additional metadata from OpenAlex
function extractOpenAlexMetadata(work: OpenAlexWork): Partial<MultiApiPaper> {
  const metadata: Partial<MultiApiPaper> = {};

  if (work.publication_year) metadata.year = work.publication_year;

  if (work.primary_location?.source) {
    const source = work.primary_location.source;
    const venueName = source.display_name;
    const isConference = source.type === 'conference' ||
                        venueName?.toLowerCase().includes('conference') ||
                        venueName?.toLowerCase().includes('proceedings');

    if (isConference) {
      metadata.conference = venueName;
    } else {
      metadata.journal = venueName;
    }
  }

  if (work.publisher) metadata.publisher = work.publisher;
  if (work.type) metadata.type = work.type;

  return metadata;
}

// Extract CrossRef metadata
function extractCrossRefMetadata(paper: CrossRefPaper): Partial<MultiApiPaper> {
  const metadata: Partial<MultiApiPaper> = {};

  if (paper.published?.['date-parts']?.[0]) {
    const [year, month = 1, day = 1] = paper.published['date-parts'][0];
    metadata.year = year;
    metadata.publishedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  if (paper['container-title']?.[0]) {
    const containerTitle = paper['container-title'][0];
    const isConference = paper.type === 'proceedings-article' ||
                        containerTitle.toLowerCase().includes('conference') ||
                        containerTitle.toLowerCase().includes('proceedings');

    if (isConference) {
      metadata.conference = containerTitle;
    } else {
      metadata.journal = containerTitle;
    }
  }

  if (paper.publisher) metadata.publisher = paper.publisher;
  if (paper.type) metadata.type = paper.type;
  if (paper['references-count']) metadata.referencesCount = paper['references-count'];

  // Extract URLs
  if (paper.link) {
    for (const link of paper.link) {
      if (link['content-type'] === 'application/pdf' || link['content-type'] === 'unspecified') {
        metadata.pdfUrl = link.URL;
      } else if (link['content-type'] === 'text/html') {
        metadata.htmlUrl = link.URL;
      }
    }
  }

  return metadata;
}

// Extract Semantic Scholar metadata
function extractSemanticScholarMetadata(paper: SemanticScholarPaper): Partial<MultiApiPaper> {
  const metadata: Partial<MultiApiPaper> = {};

  if (paper.year) metadata.year = paper.year;
  if (paper.venue) metadata.journal = paper.venue;
  if (paper.url) metadata.htmlUrl = paper.url;
  if (paper.openAccessPdf?.url) metadata.pdfUrl = paper.openAccessPdf.url;

  // Extract citing DOIs
  if (paper.citations) {
    const dois = paper.citations.map((c: any) => c.externalIds?.DOI).filter(Boolean);
    if (dois?.length) metadata.citingDois = uniq(dois);
  }

  return metadata;
}

// Main function to fetch paper by DOI using multiple APIs
export async function getPaperByDOI(doiRaw: string): Promise<MultiApiPaper> {
  const doi = doiRaw.trim().replace(/^doi:/i, "").toLowerCase();
  const out: MultiApiPaper = { doi, sources: [] };

  // Make all primary API calls concurrently for better performance
  const apiPromises = [
    // OpenAlex (primary - most reliable for basic metadata)
    fetch(`https://api.openalex.org/works/doi:${encodeURIComponent(doi)}`, {
      headers: { "User-Agent": UA }
    }).then(r => r.ok ? r.json() : null).catch(() => null),

    // CrossRef (bibliographic fallback)
    fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: { "User-Agent": UA }
    }).then(r => r.ok ? r.json() : null).catch(() => null),

    // Semantic Scholar (enrichment)
    fetch(`https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}?fields=title,abstract,authors.name,citationCount,year,venue,url,openAccessPdf`, {
      headers: S2_API_KEY ? { "x-api-key": S2_API_KEY } : {}
    }).then(r => r.ok ? r.json() : null).catch(() => null),
  ];

  // Wait for all primary APIs to complete
  const [openAlexResult, crossRefResult, semanticScholarResult] = await Promise.allSettled(apiPromises);

  // Process results from concurrent API calls
  // OpenAlex result
  if (openAlexResult.status === 'fulfilled' && openAlexResult.value) {
    const w: OpenAlexWork = openAlexResult.value;
    out.title ||= w.title;
    out.authors ||= normalizeAuthors((w.authorships || []).map((a: any) => ({ name: a.author?.display_name })));
    out.abstract ||= reconstructOpenAlexAbstract(w.abstract_inverted_index);
    if (typeof w.cited_by_count === "number") out.citationCount ??= w.cited_by_count;
    out.sources.push("openalex");

    // Extract additional metadata
    const openAlexMeta = extractOpenAlexMetadata(w);
    Object.assign(out, openAlexMeta);
  }

  // CrossRef result
  if (crossRefResult.status === 'fulfilled' && crossRefResult.value) {
    const cr = crossRefResult.value;
    out.title ||= cr.message?.title?.[0];
    out.authors ||= normalizeAuthors((cr.message?.author || []).map((a: any) => ({ name: a.given + " " + a.family })));
    out.abstract ||= cr.message?.abstract;
    if (typeof cr.message?.["is-referenced-by-count"] === "number") out.citationCount ??= cr.message?.["is-referenced-by-count"];
    out.sources.push("crossref");

    // Extract additional metadata
    const crossRefMeta = extractCrossRefMetadata(cr);
    Object.assign(out, crossRefMeta);
  }

  // Semantic Scholar result
  if (semanticScholarResult.status === 'fulfilled' && semanticScholarResult.value) {
    const ss = semanticScholarResult.value;
    out.title ||= ss.title;
    out.authors ||= normalizeAuthors((ss.authors || []).map((a: any) => ({ name: a.name })));
    out.abstract ||= ss.abstract;
    if (typeof ss.citationCount === "number") out.citationCount ??= ss.citationCount;
    out.sources.push("semanticscholar");

    // Extract additional metadata
    const semanticScholarMeta = extractSemanticScholarMetadata(ss);
    Object.assign(out, semanticScholarMeta);
  }

  // If we have basic metadata, start background enrichment
  if (out.title && out.authors?.length) {
    // Background enrichment for citing DOIs and other slow operations
    setTimeout(async () => {
      try {
        // Try to grab citing DOIs via OpenAlex (slow operation)
        if (!out.citingDois) {
          const c = await fetch(
            `https://api.openalex.org/works?filter=cites:doi:${encodeURIComponent(doi)}&per-page=200`,
            { headers: { "User-Agent": UA } }
          );
          if (c.ok) {
            const cj = await c.json();
            const dois = (cj.results || []).map((it: any) => it.doi).filter(Boolean);
            if (dois?.length) out.citingDois = uniq(dois);
          }
        }

        // Additional enrichment could go here (e.g., more citation data, etc.)
      } catch (error) {
        console.warn('Background enrichment failed:', error);
      }
    }, 0); // Run immediately in background
  }

  return out;
}

// Convert MultiApiPaper to our Paper format (for database storage)
export const multiApiToPaper = (paper: MultiApiPaper): Omit<Paper, 'id'> => {
  return {
    doi: paper.doi,
    title: paper.title || 'Unknown Title',
    abstract: paper.abstract || null,
    year: paper.year,
    journal: paper.journal,
    conference: paper.conference,
    publishedDate: paper.publishedDate,
    authors: paper.authors?.map(a => a.name || `${a.given || ''} ${a.family || ''}`.trim()).filter(name => name && name.trim().length > 0),
    referencesCount: paper.referencesCount,
    citationCount: paper.citationCount,
    publisher: paper.publisher,
    type: paper.type,
    pdfUrl: paper.pdfUrl,
    htmlUrl: paper.htmlUrl
  };
};

// Extract comprehensive metadata for display
export const extractPaperMetadata = (paper: MultiApiPaper): DisplayPaperMetadata => {
  return {
    ...paper,
    authors: paper.authors?.map(a => a.name || `${a.given || ''} ${a.family || ''}`.trim()).filter(name => name && name.trim().length > 0)
  };
};

// Validate DOI format before making API call
export const isValidDOIBeforeLookup = (doi: string): boolean => {
  const doiRegex = /^10\.\d{4,}\/.+/;
  return doiRegex.test(doi);
};

// Get multiple papers (batch processing)
export const fetchMultiplePapers = async (dois: string[]): Promise<Map<string, MultiApiPaper>> => {
  const results = new Map<string, MultiApiPaper>();

  // Process in batches to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < dois.length; i += batchSize) {
    const batch = dois.slice(i, i + batchSize);

    const promises = batch.map(async (doi) => {
      try {
        const paper = await getPaperByDOI(doi);
        results.set(doi, paper);
      } catch (error) {
        console.warn(`Failed to fetch DOI ${doi}:`, error);
      }
    });

    await Promise.all(promises);

    // Small delay between batches to be respectful to the APIs
    if (i + batchSize < dois.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
};

// Legacy function name for backward compatibility
export const fetchPaperFromCrossRef = getPaperByDOI;
