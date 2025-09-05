// Multi-API paper metadata fetching with cascading fallback
// Primary: OpenAlex → CrossRef → Semantic Scholar → Europe PMC → OpenCitations
// Based on: https://api.openalex.org/, https://api.crossref.org/, https://api.semanticscholar.org/

import { Paper, Author } from '@/types';
import { normalizeDOI } from './doi';

// Author interface for API responses (different from database Author)
interface ApiAuthor {
  name?: string;
  given?: string;
  family?: string;
}

// Filter for academic content types only
function isAcademicContent(type?: string): boolean {
  if (!type) return true; // If no type specified, include it

  const academicTypes = [
    'journal-article',
    'proceedings-article',
    'book-chapter',
    'book',
    'monograph',
    'dissertation',
    'report',
    'preprint',
    'working-paper',
    'conference-paper',
    'article',
    'paper',
    'chapter'
  ];

  const nonAcademicTypes = [
    'figure',
    'table',
    'dataset',
    'software',
    'presentation',
    'poster',
    'video',
    'audio',
    'image',
    'diagram',
    'chart',
    'graph',
    'component',
    'reference-entry',
    'entry',
    'other'
  ];

  const lowerType = type.toLowerCase();

  // Exclude non-academic types
  if (nonAcademicTypes.some(t => lowerType.includes(t))) {
    return false;
  }

  // Include academic types
  if (academicTypes.some(t => lowerType.includes(t))) {
    return true;
  }

  // For unknown types, check if it contains academic keywords
  const academicKeywords = ['article', 'paper', 'chapter', 'journal', 'conference', 'proceedings'];
  return academicKeywords.some(keyword => lowerType.includes(keyword));
}

// Enhanced paper interface for multi-API results
export interface MultiApiPaper {
  doi: string;
  title?: string;
  authors?: ApiAuthor[];
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

function normalizeAuthors(auths: any[]): ApiAuthor[] {
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

// Global cache for API call timestamps to prevent rapid successive calls
const crossrefApiCallCache = new Map<string, number>();
// Global rate limit tracker
let lastApiCallTime = 0;
const MIN_API_CALL_INTERVAL = 2000; // 2 seconds between any API calls

// Main function to fetch paper by DOI using multiple APIs
export async function getPaperByDOI(doiRaw: string): Promise<MultiApiPaper> {
  const doi = normalizeDOI(doiRaw);
  const out: MultiApiPaper = { doi, sources: [] };
  console.log('crossref: Fetching DOI', doi);

  // Validate DOI format before proceeding
  if (!isValidDOIBeforeLookup(doi)) {
    console.log('crossref: Invalid DOI format:', doi);
    return out; // Return empty result for invalid DOI
  }

  // Check global rate limit first
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCallTime;
  if (timeSinceLastCall < MIN_API_CALL_INTERVAL) {
    const waitTime = MIN_API_CALL_INTERVAL - timeSinceLastCall;
    console.log(`crossref: Rate limiting - waiting ${waitTime}ms before API call`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  // Check if we recently made an API call for this specific DOI
  const lastDoiCallTime = crossrefApiCallCache.get(doi);
  if (lastDoiCallTime && (now - lastDoiCallTime) < 60000) { // 60 second cooldown per DOI
    console.log('crossref: DOI API call too recent, returning empty result');
    return out; // Return empty result to avoid rate limits
  }

  // Update both global and DOI-specific timestamps
  lastApiCallTime = Date.now();
  crossrefApiCallCache.set(doi, lastApiCallTime);

  // Make all primary API calls concurrently for better performance
  const apiPromises = [
    // OpenAlex (primary - most reliable for basic metadata)
    fetch(`https://api.openalex.org/works/doi:${encodeURIComponent(doi)}`, {
      headers: { "User-Agent": UA }
    }).then(async r => {
      console.log('crossref: OpenAlex response status:', r.status, 'for DOI:', doi);
      if (!r.ok) {
        const text = await r.text();
        console.log('crossref: OpenAlex error response:', text);
        // If we get a 429 (rate limit), increase the global cooldown
        if (r.status === 429) {
          console.log('crossref: Rate limit hit on OpenAlex, increasing cooldown');
          lastApiCallTime = Date.now() + 10000; // Add 10 seconds to cooldown
        }
      }
      return r.ok ? r.json() : null;
    }).catch((error) => {
      console.log('crossref: OpenAlex fetch error:', error);
      return null;
    }),

    // CrossRef (bibliographic fallback)
    fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: { "User-Agent": UA }
    }).then(async r => {
      console.log('crossref: CrossRef response status:', r.status, 'for DOI:', doi);
      if (!r.ok) {
        const text = await r.text();
        console.log('crossref: CrossRef error response:', text);
        // If we get a 429 (rate limit), increase the global cooldown
        if (r.status === 429) {
          console.log('crossref: Rate limit hit on CrossRef, increasing cooldown');
          lastApiCallTime = Date.now() + 10000; // Add 10 seconds to cooldown
        }
      }
      return r.ok ? r.json() : null;
    }).catch((error) => {
      console.log('crossref: CrossRef fetch error:', error);
      return null;
    }),

    // Semantic Scholar (enrichment)
    fetch(`/api/semanticscholar/graph/v1/paper/DOI:${encodeURIComponent(doi)}?fields=title,abstract,authors.name,citationCount,year,venue,url,openAccessPdf`, {
      headers: S2_API_KEY && S2_API_KEY !== "your_semantic_scholar_api_key_here" ? { "x-api-key": S2_API_KEY } : {}
    }).then(async r => {
      console.log('crossref: Semantic Scholar response status:', r.status, 'for DOI:', doi);
      if (!r.ok) {
        const text = await r.text();
        console.log('crossref: Semantic Scholar error response:', text);
        // If we get a 429 (rate limit), increase the global cooldown
        if (r.status === 429) {
          console.log('crossref: Rate limit hit, increasing cooldown');
          lastApiCallTime = Date.now() + 10000; // Add 10 seconds to cooldown
        }
      }
      return r.ok ? r.json() : null;
    }).catch((error) => {
      console.log('crossref: Semantic Scholar fetch error:', error);
      return null;
    }),
  ];

  // Wait for all primary APIs to complete
  const [openAlexResult, crossRefResult, semanticScholarResult] = await Promise.allSettled(apiPromises);
  console.log('crossref: API results', {
    openAlex: openAlexResult.status === 'fulfilled' ? !!openAlexResult.value : 'failed',
    crossRef: crossRefResult.status === 'fulfilled' ? !!crossRefResult.value : 'failed',
    semanticScholar: semanticScholarResult.status === 'fulfilled' ? !!semanticScholarResult.value : 'failed'
  });

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

  console.log('crossref: Final paper data', { title: out.title, sources: out.sources });

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
        // Background enrichment failed silently
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
  const doiPattern = /^10\.\d{4,}\/\S+$/;
  return doiPattern.test(doi);
};

// Validate PubMed ID format
export const isValidPMID = (pmid: string): boolean => {
  return /^\d+$/.test(pmid.trim()) && pmid.trim().length >= 1;
};

// Convert PubMed ID to DOI using NCBI E-utilities
export async function convertPMIDtoDOI(pmid: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&retmode=xml&rettype=abstract`,
      { headers: { "User-Agent": UA } }
    );

    if (!response.ok) {
      return null;
    }

    const xmlText = await response.text();
    
    // Extract DOI from the XML response
    const doiMatch = xmlText.match(/<ELocationID[^>]*EIdType="doi"[^>]*>([^<]+)<\/ELocationID>/);
    if (doiMatch) {
      return doiMatch[1];
    }

    // Alternative: try to find DOI in the article ID list
    const articleIdMatch = xmlText.match(/<ArticleId[^>]*IdType="doi"[^>]*>([^<]+)<\/ArticleId>/);
    if (articleIdMatch) {
      return articleIdMatch[1];
    }

    return null;
  } catch (error) {
    console.error('Error converting PMID to DOI:', error);
    return null;
  }
}

// Get paper by PubMed ID
export async function getPaperByPMID(pmid: string): Promise<MultiApiPaper | null> {
  try {
    // First try to convert PMID to DOI
    const doi = await convertPMIDtoDOI(pmid);
    if (doi) {
      // If we got a DOI, use the existing DOI lookup
      return await getPaperByDOI(doi);
    }

    // If no DOI found, try to get basic info from PubMed
    const response = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&retmode=xml&rettype=abstract`,
      { headers: { "User-Agent": UA } }
    );

    if (!response.ok) {
      return null;
    }

    const xmlText = await response.text();
    
    // Parse basic information from PubMed XML
    const titleMatch = xmlText.match(/<ArticleTitle>([^<]+)<\/ArticleTitle>/);
    const abstractMatch = xmlText.match(/<AbstractText[^>]*>([^<]+)<\/AbstractText>/);
    const yearMatch = xmlText.match(/<PubDate[^>]*>.*?<Year[^>]*>([^<]+)<\/Year>.*?<\/PubDate>/);
    const journalMatch = xmlText.match(/<Title>([^<]+)<\/Title>/);
    
    // Extract authors
    const authorMatches = xmlText.match(/<Author[^>]*>.*?<LastName[^>]*>([^<]+)<\/LastName>.*?<ForeName[^>]*>([^<]+)<\/ForeName>.*?<\/Author>/g);
    const authors: ApiAuthor[] = [];
    
    if (authorMatches) {
      for (const authorMatch of authorMatches) {
        const lastNameMatch = authorMatch.match(/<LastName[^>]*>([^<]+)<\/LastName>/);
        const foreNameMatch = authorMatch.match(/<ForeName[^>]*>([^<]+)<\/ForeName>/);
        
        if (lastNameMatch && foreNameMatch) {
          authors.push({
            name: `${foreNameMatch[1]} ${lastNameMatch[1]}`,
            given: foreNameMatch[1],
            family: lastNameMatch[1]
          });
        }
      }
    }

    if (titleMatch) {
      const paper: MultiApiPaper = {
        doi: `pmid:${pmid}`, // Use PMID as identifier since no DOI
        title: titleMatch[1],
        authors: authors,
        abstract: abstractMatch ? abstractMatch[1] : undefined,
        year: yearMatch ? parseInt(yearMatch[1]) : undefined,
        journal: journalMatch ? journalMatch[1] : undefined,
        sources: ['pubmed']
      };

      return paper;
    }

    return null;
  } catch (error) {
    console.error('Error fetching paper by PMID:', error);
    return null;
  }
}

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
        // Failed to fetch DOI silently
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

// Search papers by keywords using multiple APIs
export async function searchPapersByKeywords(query: string, limit = 20): Promise<MultiApiPaper[]> {
  const results: MultiApiPaper[] = [];
  const seenDois = new Set<string>();

  try {
    // Import search parser for advanced queries
    const { parseSearchQuery, buildCrossRefSearchQuery } = await import('./searchParser');

    // Parse the search query
    const parsedQuery = parseSearchQuery(query);
    const crossRefQuery = buildCrossRefSearchQuery(parsedQuery);

    console.log('CrossRef search query:', {
      original: query,
      parsed: crossRefQuery,
      isAdvanced: parsedQuery.isAdvanced
    });

    // Search CrossRef first (good for academic papers)
    const crossRefResponse = await fetch(
      `https://api.crossref.org/works?query=${encodeURIComponent(crossRefQuery)}&rows=${limit}&sort=relevance`,
      { headers: { "User-Agent": UA } }
    );

    if (crossRefResponse.ok) {
      const crossRefData = await crossRefResponse.json();
      const crossRefPapers = crossRefData.message?.items || [];

      for (const item of crossRefPapers) {
        if (item.DOI && !seenDois.has(item.DOI) && isValidDOIBeforeLookup(item.DOI)) {
          const paper: MultiApiPaper = {
            doi: item.DOI,
            title: item.title?.[0],
            authors: normalizeAuthors(item.author || []),
            abstract: item.abstract,
            year: item.published?.['date-parts']?.[0]?.[0],
            journal: item['container-title']?.[0],
            publisher: item.publisher,
            type: item.type,
            sources: ['crossref']
          };

          if (item['is-referenced-by-count']) {
            paper.citationCount = item['is-referenced-by-count'];
          }

          if (item['references-count']) {
            paper.referencesCount = item['references-count'];
          }

          results.push(paper);
          seenDois.add(item.DOI);

          if (results.length >= limit) break;
        }
      }
    }

    // If we don't have enough results, try OpenAlex
    if (results.length < limit) {
      const openAlexResponse = await fetch(
        `https://api.openalex.org/works?search=${encodeURIComponent(crossRefQuery)}&per-page=${limit - results.length}&sort=relevance_score:desc`,
        { headers: { "User-Agent": UA } }
      );

      if (openAlexResponse.ok) {
        const openAlexData = await openAlexResponse.json();
        const openAlexPapers = openAlexData.results || [];

        for (const work of openAlexPapers) {
          if (work.doi && !seenDois.has(work.doi) && isValidDOIBeforeLookup(work.doi)) {
            const paper: MultiApiPaper = {
              doi: work.doi,
              title: work.title,
              authors: normalizeAuthors((work.authorships || []).map((a: any) => ({ name: a.author?.display_name }))),
              abstract: reconstructOpenAlexAbstract(work.abstract_inverted_index),
              year: work.publication_year,
              citationCount: work.cited_by_count,
              sources: ['openalex']
            };

            // Extract journal/conference info
            if (work.primary_location?.source) {
              const source = work.primary_location.source;
              const venueName = source.display_name;
              const isConference = source.type === 'conference' ||
                                  venueName?.toLowerCase().includes('conference') ||
                                  venueName?.toLowerCase().includes('proceedings');

              if (isConference) {
                paper.conference = venueName;
              } else {
                paper.journal = venueName;
              }
            }

            results.push(paper);
            seenDois.add(work.doi);

            if (results.length >= limit) break;
          }
        }
      }
    }

    // If still not enough results, try Semantic Scholar
    if (results.length < limit) {
      const semanticScholarResponse = await fetch(
        `/api/semanticscholar/graph/v1/paper/search?query=${encodeURIComponent(crossRefQuery)}&limit=${limit - results.length}&fields=title,abstract,authors,venue,year,citationCount,url,openAccessPdf,externalIds`,
        { headers: S2_API_KEY && S2_API_KEY !== "your_semantic_scholar_api_key_here" ? { "x-api-key": S2_API_KEY } : {} }
      );

      if (semanticScholarResponse.ok) {
        const semanticScholarData = await semanticScholarResponse.json();
        const semanticScholarPapers = semanticScholarData.data || [];

        for (const paper of semanticScholarPapers) {
          if (paper.paperId && !seenDois.has(paper.paperId)) {
            // For Semantic Scholar, try to get the actual DOI if available
            let doiToUse = paper.paperId;
            if (paper.externalIds?.DOI && isValidDOIBeforeLookup(paper.externalIds.DOI)) {
              doiToUse = paper.externalIds.DOI;
            } else if (!isValidDOIBeforeLookup(paper.paperId)) {
              // Skip if neither paperId nor DOI is a valid DOI format
              continue;
            }

            const multiApiPaper: MultiApiPaper = {
              doi: doiToUse,
              title: paper.title,
              authors: normalizeAuthors((paper.authors || []).map((a: any) => ({ name: a.name }))),
              abstract: paper.abstract,
              year: paper.year,
              journal: paper.venue,
              citationCount: paper.citationCount,
              htmlUrl: paper.url,
              pdfUrl: paper.openAccessPdf?.url,
              sources: ['semanticscholar']
            };

            results.push(multiApiPaper);
            seenDois.add(doiToUse);

            if (results.length >= limit) break;
          }
        }
      }
    }

  } catch (error) {
    console.error('Error searching papers by keywords:', error);
  }

  // Sort results by citation count in descending order (highest citations first)
  return results
    .sort((a, b) => {
      const aCitations = a.citationCount || 0;
      const bCitations = b.citationCount || 0;
      return bCitations - aCitations;
    })
    .slice(0, limit);
}
