// Advanced search query parser for Peerly
// Supports: AND, OR, NOT operators, quoted phrases, field-specific search

export interface SearchToken {
  type: 'term' | 'operator' | 'phrase' | 'field' | 'lparen' | 'rparen';
  value: string;
  field?: string;
}

export interface ParsedQuery {
  original: string;
  tokens: SearchToken[];
  isAdvanced: boolean;
}

export class SearchQueryParser {
  private query: string;
  private position: number = 0;

  constructor(query: string) {
    this.query = query.trim();
  }

  parse(): ParsedQuery {
    const tokens: SearchToken[] = [];
    let isAdvanced = false;

    while (this.position < this.query.length) {
      const char = this.query[this.position];

      if (char === '(') {
        tokens.push({ type: 'lparen', value: '(' });
        this.position++;
        isAdvanced = true;
      } else if (char === ')') {
        tokens.push({ type: 'rparen', value: ')' });
        this.position++;
        isAdvanced = true;
      } else if (this.isOperator(char)) {
        const operator = this.readOperator();
        tokens.push({ type: 'operator', value: operator });
        isAdvanced = true;
      } else if (char === '"') {
        const phrase = this.readQuotedPhrase();
        tokens.push({ type: 'phrase', value: phrase });
        isAdvanced = true;
      } else if (this.isFieldSearch()) {
        const fieldToken = this.readFieldSearch();
        tokens.push(fieldToken);
        isAdvanced = true;
      } else if (!this.isWhitespace(char)) {
        const term = this.readTerm();
        tokens.push({ type: 'term', value: term });
      } else {
        this.position++;
      }
    }

    return {
      original: this.query,
      tokens,
      isAdvanced
    };
  }

  private isOperator(char: string): boolean {
    return char === '&' || char === '|' || char === '!';
  }

  private readOperator(): string {
    if (this.query.substr(this.position, 3).toUpperCase() === 'AND') {
      this.position += 3;
      this.skipWhitespace();
      return 'AND';
    } else if (this.query.substr(this.position, 2).toUpperCase() === 'OR') {
      this.position += 2;
      this.skipWhitespace();
      return 'OR';
    } else if (this.query.substr(this.position, 3).toUpperCase() === 'NOT') {
      this.position += 3;
      this.skipWhitespace();
      return 'NOT';
    } else if (this.query[this.position] === '&') {
      this.position++;
      if (this.query[this.position] === '&') {
        this.position++;
      }
      this.skipWhitespace();
      return 'AND';
    } else if (this.query[this.position] === '|') {
      this.position++;
      if (this.query[this.position] === '|') {
        this.position++;
      }
      this.skipWhitespace();
      return 'OR';
    } else if (this.query[this.position] === '!') {
      this.position++;
      this.skipWhitespace();
      return 'NOT';
    }

    return '';
  }

  private readQuotedPhrase(): string {
    this.position++; // Skip opening quote
    let phrase = '';

    while (this.position < this.query.length && this.query[this.position] !== '"') {
      phrase += this.query[this.position];
      this.position++;
    }

    if (this.query[this.position] === '"') {
      this.position++; // Skip closing quote
    }

    this.skipWhitespace();
    return phrase;
  }

  private isFieldSearch(): boolean {
    const colonIndex = this.query.indexOf(':', this.position);
    if (colonIndex === -1) return false;

    const field = this.query.substring(this.position, colonIndex);
    return /^[a-zA-Z_]+$/.test(field);
  }

  private readFieldSearch(): SearchToken {
    const colonIndex = this.query.indexOf(':', this.position);
    const field = this.query.substring(this.position, colonIndex);
    this.position = colonIndex + 1;

    let value = '';

    if (this.query[this.position] === '"') {
      value = this.readQuotedPhrase();
    } else {
      value = this.readTerm();
    }

    return {
      type: 'field',
      value,
      field
    };
  }

  private readTerm(): string {
    let term = '';

    while (this.position < this.query.length) {
      const char = this.query[this.position];

      if (this.isWhitespace(char) || char === '(' || char === ')' || this.isOperator(char)) {
        break;
      }

      term += char;
      this.position++;
    }

    this.skipWhitespace();
    return term;
  }

  private isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }

  private skipWhitespace(): void {
    while (this.position < this.query.length && this.isWhitespace(this.query[this.position])) {
      this.position++;
    }
  }
}

// Convert parsed query to Supabase-compatible search
export function buildSupabaseSearchQuery(parsedQuery: ParsedQuery): string {
  if (!parsedQuery.isAdvanced) {
    // Simple search - maintain backward compatibility
    return `title.ilike.%${parsedQuery.original}%,abstract.ilike.%${parsedQuery.original}%,journal.ilike.%${parsedQuery.original}%,conference.ilike.%${parsedQuery.original}%`;
  }

  // For advanced queries, build conditions that work with Supabase's .or() method
  const conditions: string[] = [];

  for (const token of parsedQuery.tokens) {
    if (token.type === 'term' || token.type === 'phrase') {
      const searchTerm = token.value.replace(/'/g, "''"); // Escape single quotes for PostgreSQL
      conditions.push(`title.ilike.%${searchTerm}%`);
      conditions.push(`abstract.ilike.%${searchTerm}%`);
      conditions.push(`journal.ilike.%${searchTerm}%`);
      conditions.push(`conference.ilike.%${searchTerm}%`);
    } else if (token.type === 'field') {
      const searchTerm = token.value.replace(/'/g, "''"); // Escape single quotes for PostgreSQL

      switch (token.field) {
        case 'title':
          conditions.push(`title.ilike.%${searchTerm}%`);
          break;
        case 'author':
          conditions.push(`authors::text.ilike.%${searchTerm}%`);
          break;
        case 'year':
          conditions.push(`year::text.ilike.%${searchTerm}%`);
          break;
        case 'journal':
          conditions.push(`journal.ilike.%${searchTerm}%`);
          break;
        default:
          conditions.push(`title.ilike.%${searchTerm}%`);
          conditions.push(`abstract.ilike.%${searchTerm}%`);
      }
    }
  }

  // If no conditions were built, fall back to original query
  if (conditions.length === 0) {
    return `title.ilike.%${parsedQuery.original}%,abstract.ilike.%${parsedQuery.original}%,journal.ilike.%${parsedQuery.original}%,conference.ilike.%${parsedQuery.original}%`;
  }

  // Join conditions with commas for Supabase's .or() method
  return conditions.join(',');
}

// Convert parsed query to CrossRef API search
export function buildCrossRefSearchQuery(parsedQuery: ParsedQuery): string {
  if (!parsedQuery.isAdvanced) {
    return parsedQuery.original;
  }

  // For CrossRef, simplify to space-separated terms
  const searchTerms: string[] = [];

  for (const token of parsedQuery.tokens) {
    if (token.type === 'term' || token.type === 'phrase') {
      searchTerms.push(token.value);
    }
  }

  return searchTerms.join(' ');
}

// Parse a search query
export function parseSearchQuery(query: string): ParsedQuery {
  const parser = new SearchQueryParser(query);
  return parser.parse();
}
