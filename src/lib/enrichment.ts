// Live per-paper enrichment from open, keyless APIs that allow browser calls (CORS).
// Based on: https://api.crossref.org/, https://api.openalex.org/, https://api.unpaywall.org/,
// https://www.ebi.ac.uk/europepmc/webservices/rest/, https://citation.doi.org/

import { normalizeDOI } from '@/lib/doi';

// Crossref and Unpaywall both want a real contact address (Unpaywall rejects placeholders with 422)
export const CONTACT_EMAIL: string = import.meta.env.VITE_SUPPORT_EMAIL || '';
const hasContactEmail = CONTACT_EMAIL.includes('@') && !CONTACT_EMAIL.endsWith('example.com');

export function withMailto(url: string): string {
  if (!hasContactEmail) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}mailto=${encodeURIComponent(CONTACT_EMAIL)}`;
}

// ---------- OpenAlex work record (single-DOI lookups are free) ----------

interface OpenAlexLocation {
  pdf_url?: string | null;
  landing_page_url?: string | null;
  license?: string | null;
  version?: string | null;
  source?: {
    display_name?: string;
    is_in_doaj?: boolean;
    issn_l?: string | null;
    host_organization_name?: string | null;
  } | null;
}

interface OpenAlexWorkRecord {
  id?: string;
  is_retracted?: boolean;
  open_access?: { is_oa?: boolean; oa_status?: string; oa_url?: string | null };
  best_oa_location?: OpenAlexLocation | null;
  primary_location?: OpenAlexLocation | null;
  authorships?: Array<{
    author?: { display_name?: string; orcid?: string | null };
    institutions?: Array<{ display_name?: string; ror?: string | null; country_code?: string | null }>;
    is_corresponding?: boolean;
  }>;
  topics?: Array<{ display_name: string; score: number; field?: { display_name?: string } }>;
  keywords?: Array<{ display_name: string; score?: number }>;
  counts_by_year?: Array<{ year: number; cited_by_count: number }>;
  cited_by_count?: number;
  fwci?: number | null;
  citation_normalized_percentile?: { value?: number; is_in_top_1_percent?: boolean; is_in_top_10_percent?: boolean } | null;
  related_works?: string[];
  apc_list?: { value_usd?: number } | null;
}

const OPENALEX_FIELDS = [
  'id', 'is_retracted', 'open_access', 'best_oa_location', 'primary_location', 'authorships', 'topics', 'keywords',
  'counts_by_year', 'cited_by_count', 'fwci', 'citation_normalized_percentile', 'related_works', 'apc_list',
].join(',');

const openAlexCache = new Map<string, Promise<OpenAlexWorkRecord | null>>();

function getOpenAlexWork(doi: string): Promise<OpenAlexWorkRecord | null> {
  const cached = openAlexCache.get(doi);
  if (cached) return cached;
  const promise = fetch(`https://api.openalex.org/works/doi:${encodeURIComponent(doi)}?select=${OPENALEX_FIELDS}`)
    .then(r => (r.ok ? r.json() : null))
    .catch(() => null);
  openAlexCache.set(doi, promise);
  return promise;
}

export type OAStatus = 'diamond' | 'gold' | 'hybrid' | 'green' | 'bronze' | 'closed';

export interface ProfileAuthor {
  name: string;
  orcid?: string;
  isCorresponding?: boolean;
  affiliationIndexes: number[]; // 1-based indexes into PaperProfile.affiliations
}

export interface ProfileAffiliation {
  name: string;
  ror?: string;
  countryCode?: string;
}

export interface PaperProfile {
  openAlexId?: string; // e.g. "W2023271753"
  authors: ProfileAuthor[];
  affiliations: ProfileAffiliation[];
  oaStatus?: OAStatus;
  venue?: { name?: string; publisher?: string; inDoaj: boolean; apcUsd?: number };
  topics: Array<{ name: string; field?: string }>;
  keywords: string[];
  citationsByYear: Array<{ year: number; count: number }>;
  citationCount?: number;
  fwci?: number;
  percentile?: { value: number; top1: boolean; top10: boolean };
  relatedWorkIds: string[];
}

export async function getPaperProfile(doiRaw: string): Promise<PaperProfile | null> {
  const w = await getOpenAlexWork(normalizeDOI(doiRaw));
  if (!w) return null;

  // Number affiliations in order of first appearance, like a journal title page
  const affiliations: ProfileAffiliation[] = [];
  const affIndex = new Map<string, number>();
  const authors: ProfileAuthor[] = (w.authorships || [])
    .filter(a => a.author?.display_name)
    .map(a => {
      const indexes: number[] = [];
      for (const inst of a.institutions || []) {
        if (!inst.display_name) continue;
        const key = inst.ror || inst.display_name;
        if (!affIndex.has(key)) {
          affiliations.push({ name: inst.display_name, ror: inst.ror || undefined, countryCode: inst.country_code || undefined });
          affIndex.set(key, affiliations.length);
        }
        indexes.push(affIndex.get(key)!);
      }
      return {
        name: a.author!.display_name!,
        orcid: a.author?.orcid || undefined,
        isCorresponding: a.is_corresponding,
        affiliationIndexes: indexes,
      };
    });

  const source = w.primary_location?.source;
  const status = w.open_access?.oa_status as OAStatus | undefined;
  const pct = w.citation_normalized_percentile;

  return {
    openAlexId: w.id?.replace('https://openalex.org/', ''),
    authors,
    affiliations,
    oaStatus: status,
    venue: source || w.apc_list
      ? {
          name: source?.display_name,
          publisher: source?.host_organization_name || undefined,
          inDoaj: !!source?.is_in_doaj,
          apcUsd: w.apc_list?.value_usd,
        }
      : undefined,
    // OpenAlex returns low-confidence topics too; keep the ones it is reasonably sure about
    topics: (w.topics || []).filter(t => t.score >= 0.3).slice(0, 3).map(t => ({ name: t.display_name, field: t.field?.display_name })),
    keywords: (w.keywords || []).slice(0, 6).map(k => k.display_name),
    citationsByYear: (w.counts_by_year || []).map(c => ({ year: c.year, count: c.cited_by_count })).sort((a, b) => a.year - b.year),
    citationCount: w.cited_by_count,
    fwci: typeof w.fwci === 'number' ? w.fwci : undefined,
    percentile: typeof pct?.value === 'number'
      ? { value: pct.value, top1: !!pct.is_in_top_1_percent, top10: !!pct.is_in_top_10_percent }
      : undefined,
    relatedWorkIds: (w.related_works || []).map(id => id.replace('https://openalex.org/', '')),
  };
}

export interface RelatedPaper {
  id: string;
  doi?: string;
  title: string;
  year?: number;
  firstAuthor?: string;
  authorCount: number;
  citationCount?: number;
  reason: 'cites' | 'related';
}

interface OpenAlexListItem {
  id: string;
  doi?: string | null;
  display_name?: string;
  publication_year?: number;
  cited_by_count?: number;
  authorships?: Array<{ author?: { display_name?: string } }>;
  primary_topic?: { field?: { display_name?: string } } | null;
}

const LIST_SELECT = 'id,doi,display_name,publication_year,cited_by_count,authorships,primary_topic';

// Each list call costs about $0.0001 on OpenAlex
async function listWorks(filter: string, extra = ''): Promise<OpenAlexListItem[]> {
  const r = await fetch(`https://api.openalex.org/works?filter=${filter}&select=${LIST_SELECT}${extra}`);
  if (!r.ok) return [];
  return ((await r.json()).results || []).filter((w: OpenAlexListItem) => w.display_name);
}

function toRelated(w: OpenAlexListItem, reason: RelatedPaper['reason']): RelatedPaper {
  return {
    id: w.id,
    doi: w.doi ? normalizeDOI(w.doi) : undefined,
    title: w.display_name!,
    year: w.publication_year,
    firstAuthor: w.authorships?.[0]?.author?.display_name,
    authorCount: w.authorships?.length || 0,
    citationCount: w.cited_by_count,
    reason,
  };
}

const furtherReadingCache = new Map<string, Promise<RelatedPaper[]>>();

// The most-cited papers that build on this one, topped up with OpenAlex "related works"
// from the same field (its raw related list is often off-topic).
export function getFurtherReading(profile: PaperProfile, limit = 5): Promise<RelatedPaper[]> {
  const key = profile.openAlexId || profile.relatedWorkIds.join('|');
  if (!key) return Promise.resolve([]);
  const cached = furtherReadingCache.get(key);
  if (cached) return cached;

  const field = profile.topics[0]?.field;

  const promise = (async () => {
    const citing = profile.openAlexId && profile.citationCount
      ? (await listWorks(`cites:${profile.openAlexId}`, `&sort=cited_by_count:desc&per-page=${limit}`)).map(w => toRelated(w, 'cites'))
      : [];
    if (citing.length >= limit || !profile.relatedWorkIds.length || !field) return citing.slice(0, limit);

    const related = (await listWorks(`openalex:${profile.relatedWorkIds.slice(0, 10).join('|')}`, '&per-page=10'))
      .filter(w => w.primary_topic?.field?.display_name === field)
      .sort((a, b) => (b.cited_by_count || 0) - (a.cited_by_count || 0))
      .map(w => toRelated(w, 'related'));

    const seen = new Set(citing.map(p => p.id));
    return [...citing, ...related.filter(p => !seen.has(p.id))].slice(0, limit);
  })().catch(() => []);

  furtherReadingCache.set(key, promise);
  return promise;
}

// Crossref abstracts arrive as JATS XML (<jats:p>, <jats:title>Abstract</jats:title>, ...)
export function cleanAbstract(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const text = raw
    .replace(/<jats:title>[^<]*<\/jats:title>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^abstract[:.\s]+/i, '');
  return text || undefined;
}

// ---------- Retractions, corrections, expressions of concern ----------

export type PaperUpdateType = 'retraction' | 'withdrawal' | 'removal' | 'expression_of_concern' | 'correction' | 'other';

export interface PaperUpdate {
  type: PaperUpdateType;
  noticeDoi?: string;
  date?: string;
  source?: string; // e.g. "retraction-watch" or "publisher"
}

export interface PaperStatus {
  isRetracted: boolean;
  updates: PaperUpdate[];
}

interface CrossRefUpdatedBy {
  type?: string;
  DOI?: string;
  source?: string;
  updated?: { 'date-parts'?: number[][] };
}

function normalizeUpdateType(raw?: string): PaperUpdateType {
  const t = (raw || '').toLowerCase().replace(/[\s-]+/g, '_');
  if (t.includes('retraction')) return 'retraction';
  if (t.includes('withdraw')) return 'withdrawal';
  if (t.includes('removal')) return 'removal';
  if (t.includes('concern')) return 'expression_of_concern';
  if (t.includes('correct') || t.includes('erratum') || t.includes('corrigendum')) return 'correction';
  return 'other';
}

function datePartsToString(parts?: number[][]): string | undefined {
  const p = parts?.[0];
  if (!p?.length) return undefined;
  const [y, m = 1, d = 1] = p;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const statusCache = new Map<string, Promise<PaperStatus>>();

// Combines Crossref `updated-by` (includes Retraction Watch data) with OpenAlex `is_retracted`.
// Single-DOI lookups are free on both APIs.
export function getPaperStatus(doiRaw: string): Promise<PaperStatus> {
  const doi = normalizeDOI(doiRaw);
  const cached = statusCache.get(doi);
  if (cached) return cached;

  const promise = (async (): Promise<PaperStatus> => {
    const [crossref, openalex] = await Promise.allSettled([
      fetch(withMailto(`https://api.crossref.org/works/${encodeURIComponent(doi)}`)).then(r => (r.ok ? r.json() : null)),
      getOpenAlexWork(doi),
    ]);

    const seen = new Set<string>();
    const updates: PaperUpdate[] = [];
    const updatedBy: CrossRefUpdatedBy[] =
      crossref.status === 'fulfilled' ? crossref.value?.message?.['updated-by'] || [] : [];

    for (const u of updatedBy) {
      const type = normalizeUpdateType(u.type);
      // Publisher and Retraction Watch often report the same notice
      const key = `${type}|${(u.DOI || '').toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      updates.push({ type, noticeDoi: u.DOI, date: datePartsToString(u.updated?.['date-parts']), source: u.source });
    }

    const openAlexRetracted = openalex.status === 'fulfilled' && openalex.value?.is_retracted === true;
    const isRetracted = openAlexRetracted || updates.some(u => u.type === 'retraction' || u.type === 'withdrawal' || u.type === 'removal');

    return { isRetracted, updates };
  })().catch(() => ({ isRetracted: false, updates: [] }));

  statusCache.set(doi, promise);
  return promise;
}

// ---------- Free legal full text ----------

export interface OpenAccessLink {
  url: string;
  isPdf: boolean;
  source: 'OpenAlex' | 'Unpaywall' | 'Europe PMC';
  license?: string;
  version?: string;
}

async function fromOpenAlex(doi: string): Promise<OpenAccessLink | null> {
  const w = await getOpenAlexWork(doi);
  if (!w) return null;
  const loc = w.best_oa_location;
  if (loc?.pdf_url) {
    return { url: loc.pdf_url, isPdf: true, source: 'OpenAlex', license: loc.license || undefined, version: loc.version || undefined };
  }
  const url = loc?.landing_page_url || w.open_access?.oa_url;
  return url
    ? { url, isPdf: false, source: 'OpenAlex', license: loc?.license || undefined, version: loc?.version || undefined }
    : null;
}

async function fromUnpaywall(doi: string): Promise<OpenAccessLink | null> {
  if (!hasContactEmail) return null;
  const r = await fetch(`https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(CONTACT_EMAIL)}`);
  if (!r.ok) return null;
  const loc = (await r.json()).best_oa_location;
  if (loc?.url_for_pdf) return { url: loc.url_for_pdf, isPdf: true, source: 'Unpaywall', license: loc.license, version: loc.version };
  return loc?.url ? { url: loc.url, isPdf: false, source: 'Unpaywall', license: loc.license, version: loc.version } : null;
}

async function fromEuropePMC(doi: string): Promise<OpenAccessLink | null> {
  const query = encodeURIComponent(`DOI:"${doi}"`);
  const r = await fetch(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${query}&resultType=core&format=json&pageSize=1`);
  if (!r.ok) return null;
  const result = (await r.json()).resultList?.result?.[0];
  const links: Array<{ availabilityCode?: string; documentStyle?: string; url?: string }> =
    result?.fullTextUrlList?.fullTextUrl || [];
  // OA = open access, F = free to read
  const free = links.filter(l => l.url && (l.availabilityCode === 'OA' || l.availabilityCode === 'F'));
  const best = free.find(l => l.documentStyle === 'pdf') || free.find(l => l.documentStyle === 'html') || free[0];
  return best?.url ? { url: best.url, isPdf: best.documentStyle === 'pdf', source: 'Europe PMC', license: result?.license } : null;
}

const oaCache = new Map<string, Promise<OpenAccessLink | null>>();

// Tries sources in order of cost and coverage; first PDF wins, otherwise first landing page.
export function findOpenAccess(doiRaw: string): Promise<OpenAccessLink | null> {
  const doi = normalizeDOI(doiRaw);
  const cached = oaCache.get(doi);
  if (cached) return cached;

  const promise = (async () => {
    let fallback: OpenAccessLink | null = null;
    for (const source of [fromOpenAlex, fromUnpaywall, fromEuropePMC]) {
      try {
        const link = await source(doi);
        if (link?.isPdf) return link;
        fallback ||= link;
      } catch {
        // try the next source
      }
    }
    return fallback;
  })();

  oaCache.set(doi, promise);
  return promise;
}

// ---------- Citations via DOI content negotiation ----------

export type CitationFormat = 'apa' | 'mla' | 'chicago' | 'harvard' | 'bibtex' | 'ris';

export const CITATION_FORMATS: Record<CitationFormat, { label: string; accept: string; fileExt?: string }> = {
  apa: { label: 'APA', accept: 'text/x-bibliography; style=apa' },
  mla: { label: 'MLA', accept: 'text/x-bibliography; style=modern-language-association' },
  chicago: { label: 'Chicago', accept: 'text/x-bibliography; style=chicago-author-date' },
  harvard: { label: 'Harvard', accept: 'text/x-bibliography; style=harvard-cite-them-right' },
  bibtex: { label: 'BibTeX', accept: 'application/x-bibtex', fileExt: 'bib' },
  ris: { label: 'RIS', accept: 'application/x-research-info-systems', fileExt: 'ris' },
};

const citationCache = new Map<string, Promise<string>>();

export function getCitation(doiRaw: string, format: CitationFormat): Promise<string> {
  const doi = normalizeDOI(doiRaw);
  const key = `${doi}|${format}`;
  const cached = citationCache.get(key);
  if (cached) return cached;

  const promise = fetch(`https://doi.org/${encodeURI(doi)}`, {
    headers: { Accept: CITATION_FORMATS[format].accept },
  }).then(async r => {
    if (!r.ok) throw new Error(`Citation lookup failed (${r.status})`);
    return (await r.text()).trim();
  });

  // Don't cache failures so the user can retry
  promise.catch(() => citationCache.delete(key));
  citationCache.set(key, promise);
  return promise;
}
