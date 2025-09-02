import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ChevronDown, Loader2, Plane } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { isValidDOI, normalizeDOI } from '@/lib/doi';
import { paperDoiUrl, paperPmidUrl } from '@/lib/routing';

type SearchMode = 'doi' | 'pmid' | 'keywords';

interface SearchBarProps {
  onSearch?: (query: string, mode: SearchMode) => void;
  placeholder?: string;
  autoFocus?: boolean;
  isSearching?: boolean;
}

export function SearchBar({
  onSearch,
  placeholder = "Search papers...",
  autoFocus = false,
  isSearching = false
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<SearchMode | null>(null);
  const [validationError, setValidationError] = useState<string>('');
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
        return 'Search title, topic, or author';
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = query.trim();

    if (!trimmedQuery || !selectedMode || validationError) return;

    switch (selectedMode) {
      case 'doi':
        const normalizedDOI = normalizeDOI(trimmedQuery);
        navigate(paperDoiUrl(normalizedDOI));
        break;
      case 'pmid':
        navigate(paperPmidUrl(trimmedQuery));
        break;
      case 'keywords':
        onSearch?.(trimmedQuery, selectedMode);
        break;
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

  const isSubmitDisabled = !selectedMode || !query.trim() || !!validationError;

  return (
    <div className="space-y-4">
      {/* Combined Search Bar */}
      <div className="max-w-full sm:max-w-2xl mx-auto px-2 sm:px-0">
        <form onSubmit={handleSubmit} className="relative">
          <div className={`flex flex-col sm:flex-row items-stretch sm:items-center border-2 rounded-2xl overflow-hidden transition-all duration-300 ${
            isSearching && selectedMode === 'keywords' 
              ? 'border-primary/60 shadow-lg shadow-primary/20' 
              : 'focus-within:ring-2 focus-within:ring-primary/60'
          }`}>
            {/* Mode Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className={`flex items-center justify-between sm:justify-start gap-2 px-3 py-3 h-12 border-b sm:border-b-0 sm:border-r rounded-none min-w-full sm:min-w-[120px] md:min-w-[140px] ${
                    selectedMode === 'doi'
                      ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300'
                      : selectedMode === 'pmid'
                      ? 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:text-green-300'
                      : selectedMode === 'keywords'
                      ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-300'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted dark:bg-muted/20 dark:text-muted-foreground'
                  }`}
                >
                  <span className="truncate">
                    {selectedMode === 'doi' && 'DOI'}
                    {selectedMode === 'pmid' && 'PubMed ID'}
                    {selectedMode === 'keywords' && 'Keywords'}
                  </span>
                  <ChevronDown className="w-4 h-4 flex-shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-full sm:w-[140px] md:w-[160px]">
                <DropdownMenuItem
                  onClick={() => handleModeChange('doi')}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span>DOI</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleModeChange('pmid')}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>PubMed ID</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleModeChange('keywords')}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span>Keywords</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className={`absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-all duration-300 ${
                isSearching && selectedMode === 'keywords' ? 'text-primary animate-pulse' : 'text-muted-foreground'
              }`} />
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={getPlaceholder()}
                autoFocus={autoFocus}
                disabled={!selectedMode}
                className="pl-8 sm:pl-10 pr-8 sm:pr-12 h-12 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none text-sm sm:text-base disabled:opacity-50"
                aria-describedby={validationError ? "search-error" : undefined}
              />
              {query && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="absolute right-1 sm:right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted rounded-full"
                >
                  <X className="w-4 h-4" />
                  <span className="sr-only">Clear search</span>
                </Button>
              )}
            </div>

            {/* Search Button */}
            <Button
              type="submit"
              disabled={isSubmitDisabled || isSearching}
              className="px-3 sm:px-6 py-3 h-12 rounded-none border-t sm:border-t-0 sm:border-l relative overflow-hidden min-w-[48px] sm:min-w-[80px]"
            >
              {isSearching && selectedMode === 'keywords' ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Searching...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  <span className="hidden sm:inline">Search</span>
                </div>
              )}
              
              {/* Animated paper airplane for keyword search */}
              {isSearching && selectedMode === 'keywords' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Plane className="w-6 h-6 text-primary animate-fly" 
                         style={{ 
                           transform: 'rotate(45deg)'
                         }} />
                </div>
              )}
            </Button>
          </div>
        </form>

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
      </div>
    </div>
  );
}