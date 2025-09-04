// DOI normalization and validation utilities

export const normalizeDOI = (raw: string): string => {
  let normalized = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//, '')
    .replace(/^doi:/i, '');

  // DOIs should have the format 10.xxxx/xxxxx - the slash should be preserved
  // Remove the incorrect replacement that was converting / to .
  // The original DOI format is correct: 10.1056/nejmoa2415471

  return normalized;
};

export const isValidDOI = (doi: string): boolean => {
  // Basic DOI pattern validation
  const doiPattern = /^10\.\d{4,}\/\S+$/;
  return doiPattern.test(normalizeDOI(doi));
};

export const formatDOIUrl = (doi: string): string => {
  const normalized = normalizeDOI(doi);
  return `https://doi.org/${normalized}`;
};

export const encodeDOIForUrl = (doi: string): string => {
  return encodeURIComponent(normalizeDOI(doi));
};

export const decodeDOIFromUrl = (encoded: string): string => {
  // Reverse the custom encoding from routing.ts: - back to . and _ back to /
  return encoded.replace(/-/g, '.').replace(/_/g, '/');
};