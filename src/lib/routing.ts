// Peerly routing utilities

export const slugify = (s: string): string => 
  s.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export const paperUrl = (paper: { id: string; title: string }): string => {
  if (!paper.title) {
    return `/paper/${paper.id}`;
  }
  return `/paper/${paper.id}-${slugify(paper.title)}`;
};

export const paperDoiUrl = (doi: string): string => {
  // Create a temporary ID for DOI-based papers
  // Replace dots with - and slashes with _ to avoid URL conflicts
  const encodedDoi = doi.replace(/\./g, '-').replace(/\//g, '_');
  const tempId = `doi-${encodedDoi}`;
  return `/paper/${tempId}`;
};

export const paperPmidUrl = (pmid: string): string => {
  // Create a temporary ID for PMID-based papers
  const tempId = `pmid-${pmid}`;
  return `/paper/${tempId}`;
};

// Extract paper ID from slug
export const extractPaperId = (paperIdAndSlug: string): string => {
  // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  // Find the UUID pattern at the beginning of the string
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const match = paperIdAndSlug.match(uuidPattern);
  return match ? match[0] : '';
};

// Extract title part from slug (everything after the UUID and hyphen)
export const extractTitleFromSlug = (paperIdAndSlug: string): string => {
  const uuid = extractPaperId(paperIdAndSlug);
  if (!uuid) return '';
  
  // Remove UUID and the following hyphen
  return paperIdAndSlug.slice(uuid.length + 1);
};

// Check if current slug matches expected slug
export const shouldRedirectForSlug = (currentSlug: string, expectedTitle: string): boolean => {
  const expectedSlug = slugify(expectedTitle);
  const currentTitlePart = extractTitleFromSlug(currentSlug);
  return currentTitlePart !== expectedSlug;
};