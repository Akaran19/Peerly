import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search, X, Loader2, Bookmark } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { isValidDOI, normalizeDOI } from '@/lib/doi';
import { paperDoiUrl, paperPmidUrl, paperUrl } from '@/lib/routing';
import { dataClient } from '@/lib/dataClient';
import { UpgradeGuard, ProBadge } from '@/components/account/UpgradeGuard';
import { type Tier } from '@/lib/tier';
import { toast } from '@/hooks/use-toast';

type SearchMode = 'doi' | 'pmid' | 'keywords';


const SEARCH_MODES: Array<{ value: SearchMode; label: string }> = [
  { value: 'keywords', label: 'Keywords' },
  { value: 'doi', label: 'DOI' },
  { value: 'pmid', label: 'PubMed ID' },
];

interface SearchBarProps {
  onSearch?: (query: string, mode: SearchMode) => void;
  placeholder?: string;
  autoFocus?: boolean;
  isSearching?: boolean;
  onPaperLoaded?: (paper: any) => void;
  tier?: Tier;
}

export function SearchBar({
  onSearch,
  placeholder = "Search papers...",
  autoFocus = false,
  isSearching = false,
  onPaperLoaded,
  tier = 'free'
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<SearchMode | null>('keywords');
  const [validationError, setValidationError] = useState<string>('');
  const [isLoadingPaper, setIsLoadingPaper] = useState(false);
  const navigate = useNavigate();

  // Validation patterns
  const isValidPMID = (value: string): boolean => /^\d+$/.test(value.trim());
  const isValidKeywords = (value: string): boolean => {
    const trimmed = value.trim();
    return trimmed.length >= 3 || trimmed.split(/\s+/).filter(word => word.length > 2).length >= 2;
  };

  // Get placeholder based on selected mode
  const getPlaceholder = (): string => {
    switch (selectedMode) {
      case 'doi':
        return 'Paste DOI (e.g., 10.1038/s41586-023-XXXXX)';
      case 'pmid':
        return 'Enter PubMed ID (digits only)';
      case 'keywords':
        return 'Search papers (supports AND, OR, "quotes")';
      default:
        return placeholder;
    }
  };

  // Validate input based on selected mode
  const validateInput = (value: string): string => {
    if (!selectedMode) return '';

    const trimmed = value.trim();
    if (!trimmed) return '';

    switch (selectedMode) {
      case 'doi':
        return isValidDOI(trimmed) ? '' : 'Please enter a valid DOI (e.g., 10.1038/s41586-023-XXXXX)';
      case 'pmid':
        return isValidPMID(trimmed) ? '' : 'Please enter a valid PubMed ID (digits only)';
      case 'keywords':
        return isValidKeywords(trimmed) ? '' : 'Please enter at least 3 characters or 2 meaningful words';
      default:
        return '';
    }
  };

  // Update validation error when query or mode changes
  useEffect(() => {
    const error = validateInput(query);
    setValidationError(error);
  }, [query, selectedMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('SearchBar: Form submitted', { selectedMode, query, validationError, isSubmitDisabled });
    
    const trimmedQuery = query.trim();

    if (!trimmedQuery || !selectedMode || validationError) {
      console.log('SearchBar: Form submission blocked', { trimmedQuery: !!trimmedQuery, selectedMode, validationError });
      return;
    }

    console.log('SearchBar: Submitting search', { selectedMode, trimmedQuery });

    switch (selectedMode) {
      case 'doi':
        await handleDOISearch(trimmedQuery);
        break;
      case 'pmid':
        await handlePMIDSearch(trimmedQuery);
        break;
      case 'keywords':
        onSearch?.(trimmedQuery, selectedMode);
        break;
    }
  };

  const handleDOISearch = async (doi: string) => {
    setIsLoadingPaper(true);
    try {
      const normalizedDOI = normalizeDOI(doi);
      console.log('SearchBar: Loading DOI', normalizedDOI);
      
      const paperData = await dataClient.lookupPaperByDOI(normalizedDOI);
      console.log('SearchBar: DOI lookup result', paperData);
      
      if (paperData) {
        // If we have a callback, pass the paper data
        if (onPaperLoaded) {
          onPaperLoaded(paperData);
        } else {
          // Navigate to the paper page
          const paperLink = paperUrl(paperData);
          navigate(paperLink, { state: { paper: paperData } });
        }
      } else {
        setValidationError('Paper not found. Please check the DOI and try again.');
      }
    } catch (error) {
      console.error('SearchBar: Error loading DOI', error);
      setValidationError('Error loading paper. Please try again.');
    } finally {
      setIsLoadingPaper(false);
    }
  };

  const handlePMIDSearch = async (pmid: string) => {
    setIsLoadingPaper(true);
    try {
      console.log('SearchBar: Loading PMID', pmid);
      
      const paperData = await dataClient.lookupPaperByPMID(pmid);
      console.log('SearchBar: PMID lookup result', paperData);
      
      if (paperData) {
        // If we have a callback, pass the paper data
        if (onPaperLoaded) {
          onPaperLoaded(paperData);
        } else {
          // Navigate to the paper page
          const paperLink = paperUrl(paperData);
          navigate(paperLink, { state: { paper: paperData } });
        }
      } else {
        setValidationError('Paper not found. Please check the PubMed ID and try again.');
      }
    } catch (error) {
      console.error('SearchBar: Error loading PMID', error);
      setValidationError('Error loading paper. Please try again.');
    } finally {
      setIsLoadingPaper(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setValidationError('');
    if (selectedMode === 'keywords') {
      onSearch?.('', selectedMode);
    }
  };

  const handleModeChange = (mode: SearchMode) => {
    setSelectedMode(mode);
    setValidationError('');
  };

  const isSubmitDisabled = !selectedMode || !query.trim() || !!validationError || isLoadingPaper;
  
  console.log('SearchBar render state:', {
    selectedMode,
    query,
    validationError,
    isSubmitDisabled,
    trimmedQuery: query.trim(),
    hasSelectedMode: !!selectedMode,
    hasQuery: !!query.trim(),
    hasValidationError: !!validationError
  });

  return (
    <div className="space-y-4">
      {/* Combined Search Bar */}
      <div className="max-w-full">
        <form onSubmit={handleSubmit} className="relative">
          <div className="mb-3 flex items-end gap-5" role="tablist" aria-label="Search by">
            {SEARCH_MODES.map(mode => (
              <button
                key={mode.value}
                type="button"
                role="tab"
                aria-selected={selectedMode === mode.value}
                onClick={() => handleModeChange(mode.value)}
                className={`min-h-0 min-w-0 border-b-2 pb-1 font-ident text-[11px] uppercase tracking-[0.16em] transition-colors ${
                  selectedMode === mode.value
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div
            className={`flex items-stretch overflow-hidden rounded-md border border-foreground bg-card shadow-[4px_4px_0_0_hsl(var(--foreground))] transition-shadow focus-within:shadow-[6px_6px_0_0_hsl(var(--primary))] ${
              isSearching && selectedMode === 'keywords' ? 'shadow-[6px_6px_0_0_hsl(var(--primary))]' : ''
            }`}
          >
            <div className="relative flex-1">
              <Search
                className={`absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 ${
                  isSearching && selectedMode === 'keywords' ? 'animate-pulse text-primary' : 'text-muted-foreground'
                }`}
              />
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={getPlaceholder()}
                autoFocus={autoFocus}
                disabled={!selectedMode}
                className="h-14 rounded-none border-0 bg-transparent pl-11 pr-10 font-editorial text-lg placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50"
                aria-describedby={validationError ? "search-error" : undefined}
                aria-label="Search query"
              />
              {query && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-2 top-1/2 flex h-8 min-h-0 w-8 min-w-0 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Clear search</span>
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitDisabled || isSearching}
              className="flex min-w-[56px] items-center justify-center gap-2 border-l border-foreground bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/85 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[110px]"
            >
              {isLoadingPaper || (isSearching && selectedMode === 'keywords') ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {isLoadingPaper ? 'Loading' : isSearching && selectedMode === 'keywords' ? 'Searching' : 'Search'}
              </span>
            </button>
          </div>
        </form>

        {/* Save Search Button for Keywords */}
        {selectedMode === 'keywords' && query.trim() && (
          <div className="mt-4 flex">
            <UpgradeGuard tier={tier} feature="saved searches">
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => {
                  // TODO: Implement save search functionality
                  console.log('Save Search clicked:', query.trim());
                  toast({
                    title: "Feature Coming Soon",
                    description: "Save Search will allow you to save your search queries for quick access later.",
                  });
                }}
              >
                <Bookmark className="w-4 h-4" />
                Save Search
                <ProBadge />
              </Button>
            </UpgradeGuard>
          </div>
        )}

        {/* Validation Error */}
        {validationError && (
          <p
            id="search-error"
            className="text-sm text-destructive mt-2"
            role="alert"
          >
            {validationError}
          </p>
        )}

        {/* Advanced Search Help */}
        {selectedMode === 'keywords' && !validationError && (
          <p className="text-xs text-muted-foreground mt-2">
            Advanced search: Use AND, OR, NOT, or "quotes" for phrases
          </p>
        )}
      </div>
    </div>
  );
}