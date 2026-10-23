# Peerly

Goodreads for research papers: look up papers by DOI or keyword, shelve them, rate and review them. Live at [peerly.io](https://peerly.io).

Stack: React + Vite + TypeScript, Tailwind/shadcn, Supabase (Postgres + edge functions), Clerk, Vercel.

## Setup

```sh
npm install
npm run dev
```

Create `.env.local` with:

```sh
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_ANON_KEY=
VITE_CLERK_PUBLISHABLE_KEY=
VITE_SUPPORT_EMAIL=        # sent to Crossref/Unpaywall as the contact address
# optional
VITE_SENTRY_DSN=
VITE_GA_TRACKING_ID=
```

## Scripts

- `npm run dev` / `npm run build` / `npm run preview`
- `npm run lint`
- `npm run load-test` (Artillery, see `scripts/`)

## Layout

```
src/
  pages/           one file per route
  components/      grouped by feature: paper, reviews, library, search, layout, account; ui/ is shadcn
  lib/api/         external metadata APIs (OpenAlex, Crossref, Semantic Scholar, PubMed, Unpaywall, ...)
  lib/             data client, routing, storage, analytics helpers
  integrations/    Supabase client and generated types
supabase/          migrations and edge functions
scripts/           load and backup tests
docs/              launch checklist and API research
```

## License

MIT
