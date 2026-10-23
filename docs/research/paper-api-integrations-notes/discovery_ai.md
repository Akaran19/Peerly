# Discovery, Recommendations and AI Features for Peerly (as of Oct 2026)

Scope: APIs and approaches for "papers like this", "because you read X", better search, and LLM features for Peerly (React/Vite/TS, Supabase Postgres + pgvector + Deno edge functions, Clerk, Vercel). Peerly already calls Crossref, OpenAlex, Semantic Scholar (basic lookup/search) and PubMed.

Research note: api.semanticscholar.org docs pages returned HTTP 429 to the fetcher twice, so some Semantic Scholar endpoint details come from third-party wrappers and are marked as such. Anthropic pricing comes from the bundled Claude API skill reference (pricing cached 2026-10-06), not a live fetch of docs.claude.com.

## Semantic Scholar: Recommendations API, SPECTER2, TLDR, citations/references, keys and rate limits

### Takeaway
Semantic Scholar still offers the richest free features for this use case: a hosted recommendations endpoint that takes positive and negative seeds, SPECTER2 embeddings, TLDRs, and citation graphs. The catches are tight rate limits (new keys get 1 RPS), a key-approval process that has refused free-email and "third-party app" applicants since Aug 2024, and a license that does not clearly allow commercial use (some data is CC BY-NC). Use it server-side, cache aggressively, and get legal clarity before monetizing.

### Cited Findings
- Corpus size: 214M papers, 2.49B citations, 79M authors. The Academic Graph provides "SPECTER2 embeddings", and a separate Recommendations service returns papers similar to a given paper. — [Semantic Scholar API product page](https://www.semanticscholar.org/product/api)
- Unauthenticated access: "1000 requests per second shared among all unauthenticated users", throttled under heavy load. Keys are emailed after a request form. The introductory limit for keyed users is "1 RPS on all endpoints". — [Semantic Scholar API product page](https://www.semanticscholar.org/product/api)
- Release-notes history: by Feb 2024 authenticated limits were 1 RPS for batch, paper search and recommendations and 10 RPS for other calls. In Apr–May 2024 new keys moved to 1 RPS on all endpoints and the unauthenticated pool was cut further. Exponential backoff became required in Mar 2024. From Aug 2024 keys are "no longer approved for free email domains or third-party apps". From Oct–Nov 2024, keys inactive for about 60 days are pruned, and new applications ran about a month behind. The release-notes file is marked "RELEASE NOTES DISCONTINUED" and the repo was archived on Jan 27, 2025, so there is no official changelog for 2025–2026. — [allenai/s2-folks API_RELEASE_NOTES.md](https://github.com/allenai/s2-folks/blob/main/API_RELEASE_NOTES.md)
- Springer abstracts are not available through the API because of licensing. — [allenai/s2-folks release notes](https://github.com/allenai/s2-folks/blob/main/API_RELEASE_NOTES.md)
- TLDR data had a duplicate issue that was fixed in June 2024, so dataset users should re-download releases dated 2024-06-18 or later. — [allenai/s2-folks release notes](https://github.com/allenai/s2-folks/blob/main/API_RELEASE_NOTES.md)
- Recommendations endpoint: `POST https://api.semanticscholar.org/recommendations/v1/papers/` takes a body of `{positivePaperIds: [...], negativePaperIds: [...]}`. A single-seed variant takes one paper ID, and a `from` pool parameter defaults to `recent`. `limit` defaults to 100 with a maximum of 500, and the `fields` parameter is optional. These details come from third-party wrappers (official docs returned 429). — [semantic-scholar-fastmcp recommendations.py via Glama](https://glama.ai/mcp/servers/@zongmin-yu/semantic-scholar-fastmcp-mcp-server/blob/main/semantic_scholar/api/recommendations.py); [semanticscholar PyPI](https://www.pypi.org/project/semanticscholar)
- A third-party source gives the unauthenticated limit as 100 requests per 5 minutes and the keyed limit as 1/sec sustained with a 10/sec burst. This conflicts with the official page's "1000 RPS shared" pool figure, though both may be true at once, since the shared pool is split among all anonymous users. — [lava.so Semantic Scholar provider doc](https://lava.so/docs/gateway/providers/semantic-scholar)
- License terms: the API license is "limited, non-exclusive, non-transferable, non-sublicensable and terminable". You may not "repackage, sell, rent, lease, lend, distribute, or sublicense the API". Attribution to "Semantic Scholar" is required. S2 data is governed by accompanying licenses such as "CC BY-NC" or ODC-BY. AI2 may terminate access "at any time for any reason". Separately signed agreements take precedence. — [Semantic Scholar API License](https://www.semanticscholar.org/product/api/license)
- Connected Papers builds its graphs from the Semantic Scholar corpus, with roughly a 50k-paper candidate pool per graph. — [IntuitionLabs literature mapping guide](https://intuitionlabs.ai/articles/ai-literature-mapping-tools-guide)

### Inferences
- **Integration pattern.** Call S2 only from a Supabase edge function, using a server-held `x-api-key` header, and never from the browser. The 1 RPS limit is shared across all Peerly users, so cache recommendation results in Postgres with a TTL of about 7 days per seed paper.
- **"Papers like this".** `GET /recommendations/v1/papers/forpaper/{paperId}?limit=20&fields=title,year,externalIds,tldr` is a near-zero-effort feature. The path comes from prior knowledge and wrappers and needs verifying against the official docs.
- **"Because you read X" / home feed.** POST the user's highly rated "Read" shelf as `positivePaperIds` and low-rated papers as `negativePaperIds`. Recompute nightly in a batch, not per page view.
- **Fields.** The Graph API's `tldr` and `embedding.specter_v2` fields, plus the `/paper/{id}/citations` and `/paper/{id}/references` endpoints and `/paper/batch` (up to 500 IDs per call), are standard in prior versions. I could not re-verify them because the docs returned 429. Pulling `embedding.specter_v2` through `/paper/batch` when a paper is first shelved is the cheapest way to seed a pgvector table with 768-dimension SPECTER2 vectors.
- **Key approval risk.** The Aug 2024 policy against approving keys for "third-party apps" is a real risk. Apply with a company-domain email such as @peerly.io and describe the use case honestly. If no key arrives, the shared anonymous pool is unreliable for production.
- **Commercial use.** The CC BY-NC data mentions and "no repackaging" clauses mean displaying TLDRs and abstracts in a paid tier carries risk. Ask AI2 for a related agreement, or get abstracts and metadata from CC0 OpenAlex instead.

### Gaps
- I could not fetch official 2026 rate limits, the full Recommendations endpoint list, the valid `from` pool values (for example whether `all-cs` exists), or the `/snippet/search` endpoint, because api.semanticscholar.org returned HTTP 429.
- No official 2025–2026 changelog exists because the release notes are discontinued.
- I found no explicit CORS statement for the S2 API.

## OpenAlex: related_works, topics, semantic search, API key and pricing changes

### Takeaway
OpenAlex changed materially in 2026. It now has usage-based pricing: $1/day free per key, a keyless budget of $0.10/day, and paid annual plans. It also has a built-in semantic search: `search.semantic=`, using GTE-Large 1024-dimension embeddings over titles and abstracts, limited to 1 RPS and 50 results, at $1 per 1,000 calls. Singleton lookups by ID or DOI are free and the data is CC0, which makes OpenAlex the safest base for commercial use.

### Cited Findings
- Pricing: each free account gets "$1 of usage per day", resetting at midnight UTC, with no payment method required. Prepaid usage is bought in $1 increments and expires 3 months after the last purchase. Annual plans: Member $5,000/yr ($20/day budget), Member+ $10,000/yr ($100/day), Partner from $20,000/yr. The data is "released under a CC0 public-domain license" with no personal-use restriction. — [OpenAlex Pricing](https://help.openalex.org/access/pricing.md)
- Per-operation costs: single entity by ID or DOI is free; list/filter is $0.10 per 1,000; search is $1 per 1,000; semantic search is $1 per 1,000; content (PDF) download is $10 per 1,000. Without a key the budget is $0.10/day, "a tenth" of the keyed budget. — [OpenAlex Example costs](https://help.openalex.org/access/example-costs.md)
- Auth and rate limits: send the key as `api_key` in the query string or as `Authorization: Bearer`. Limits are 10 req/s without a key, 30 with a free key or prepaid usage, and 50 on annual plans. Semantic search is capped at 1 req/s. Without a key, cursor paging returns only the first page. A per-second 429 costs nothing. The docs advise keeping the key out of shared code and using an `OPENALEX_API_KEY` env var. — [OpenAlex Authentication](https://help.openalex.org/api/authentication.md)
- Semantic search: `https://api.openalex.org/works?search.semantic=<query>`, using GTE Large EN embeddings (1,024 dimensions) of the title and abstract of every work, ranked by cosine similarity. Queries are truncated to 2,000 characters and return at most 50 results, at 1 req/s. It combines with `filter` and `select`, except that the `country_code` filter and `cited_by_count` are not supported. Only one of `search`, `search.exact` or `search.semantic` is allowed per request. Example: `...works?search.semantic=mRNA vaccine immunogenicity in older adults&filter=publication_year:>2020,is_oa:true&select=id,title,relevance_score`. — [OpenAlex Semantic search](https://help.openalex.org/api/semantic-search.md)
- The docs moved from docs.openalex.org, which now 301-redirects, to help.openalex.org. Documentation sections exist for Topics, "aboutness" subject signals, and a "tag-aboutness" endpoint that tags your own text with topics and keywords. — [OpenAlex llms.txt](https://help.openalex.org/llms.txt)
- Timeline: a Jan 2026 roadmap described a credit-based model in which semantic search cost 1,000 credits. Usage-based dollar pricing launched in a late-February 2026 announcement. A July 2026 third-party analysis found that some keyless requests still worked with only `mailto`. A Sept 2026 PyPI client README cites credit figures that conflict with the official dollar pricing, so treat it as outdated. — [WebSearch summary of OpenAlex blog / casrai / PyPI oalex](https://blog.openalex.org/?p=3934); [casrai: API keys mandatory](https://casrai.org/news/openalex-api-keys-mandatory-usage-based-pricing-2026); [PyPI oalex](https://pypi.org/project/oalex/). The casrai.org pages are secondary aggregators, so the official help.openalex.org pages above take precedence.

### Inferences
- **What is outdated.** The old "polite pool via `mailto=`, 100k calls/day free" model should be treated as outdated. Peerly's existing OpenAlex calls should add an `api_key` from an edge-function secret. Any browser-side OpenAlex calls should move server-side, or else they draw on the keyless $0.10/day budget, which as I read the docs is tracked per caller rather than per app.
- **Budget math.** $1/day buys 1,000 keyword or semantic searches or 10,000 list/filter calls, and lookups are unlimited. A small app with caching can likely stay free. Semantic search at 1 RPS cannot serve real-time autocomplete, so use it for a "search by meaning" mode or an "explain your topic" box, cached by normalized query.
- **`related_works`.** Each Work object has a `related_works` field holding about 10 OpenAlex IDs, algorithmically related by shared concepts and topics. The field is free: it comes with the free singleton lookup and can be hydrated with one `filter=openalex:W1|W2|...` list call costing $0.0001. This comes from prior knowledge of the Work schema and was not re-fetched this session, so verify it.
- **Topics as features.** Each work carries `primary_topic` and `topics` (topic → subfield → field → domain), useful for shelf facets, "more in this subfield", and user taste profiles. The tag-aboutness endpoint could tag user-submitted text.
- **CC0 data.** Because OpenAlex data is CC0, abstracts (via `abstract_inverted_index`), topics and related works can be stored and displayed commercially without the licensing risk that comes with S2 data.

### Gaps
- `related_works` details and its current quality were not verified in this session, because no help.openalex.org page specifically on related works was found in llms.txt.
- CORS is not documented. Peerly's existing browser calls suggest it works today, but this is unverified.
- Pricing for the tag-aboutness endpoint was not found.
- OpenAlex does not appear to expose the raw embedding vectors, since the docs mention only semantic search. I found no download of the vectors.

## Build in-house (pgvector + embeddings) vs. hosted recommendation APIs

### Takeaway
A hybrid approach works best. Start with hosted signals: S2 recommendations, OpenAlex `related_works` and semantic search, all cached. In parallel, store an embedding per shelved paper in pgvector. Then "because you read X" and the personal feed become cheap SQL (a user taste vector made from a rating-weighted average of shelved paper embeddings, followed by nearest-neighbor search). That SQL has no per-call fees, no third-party rate limits, and can blend social signals such as "Peerly users who rated X highly also read Y".

### Cited Findings
- Supabase edge functions can generate embeddings in-process with `new Supabase.ai.Session('gte-small')` and `session.run(input, { mean_pool: true, normalize: true })`. Only `gte-small` is supported in the Edge Runtime. — [Supabase: Generate text embeddings](https://supabase.com/docs/guides/ai/quickstarts/generate-text-embeddings)
- Semantic Scholar provides precomputed SPECTER2 embeddings, a model trained on citation signals, for its corpus. — [Semantic Scholar API product page](https://www.semanticscholar.org/product/api)
- OpenAlex embeds every work with GTE Large EN (1024-d) but exposes it only through `search.semantic`. — [OpenAlex Semantic search](https://help.openalex.org/api/semantic-search.md)

### Inferences
- **Embedding source options, cheapest to most capable:**
  - **(a) S2 `embedding.specter_v2`.** 768-d and free. Fetched once per paper through `/paper/batch` and stored. It is paper-domain-specific and the best fit for paper-to-paper similarity, but it depends on S2 key access and license terms.
  - **(b) Supabase built-in `gte-small`.** 384-d by prior knowledge (dimension not stated on the fetched page). Zero marginal cost, runs inside the edge function, and has no third-party dependency. Lower quality for scientific text, but adequate for a v1.
  - **(c) A paid embedding API** (OpenAI text-embedding-3-small or Voyage, for example). Pricing was not researched this session, so see Gaps. Anthropic does not offer its own embedding model.
- **Schema sketch.** `paper_embeddings(paper_id uuid pk, model text, embedding vector(768))` with an HNSW index using `vector_cosine_ops`. Taste vector: `avg(embedding * weight)` over the user's shelf, where weight comes from the rating (for example 5★=+1, 1–2★=−0.5). Query: `order by embedding <=> taste limit 50`, excluding already-shelved papers. Precompute nightly with pg_cron or a scheduled edge function.
- **Corpus caveat.** In-house kNN only recommends papers already in Peerly's database. To surface new papers, keep the hosted APIs (S2 recs, OpenAlex related_works and semantic search) as candidate generators, then re-rank the candidates locally by cosine similarity to the user's taste vector. This hybrid is the recommended architecture.
- **Cost.** In-house adds near-zero marginal cost: pgvector is included in Supabase, and gte-small is free. Hosted APIs carry rate-limit and ToS risk but zero ops work.

### Gaps
- I did not fetch current OpenAI, Voyage or Cohere embedding prices for Oct 2026.
- I did not verify the gte-small dimension (believed to be 384) or the Supabase Edge Runtime CPU and time limits for batch embedding.
- I found no published benchmark comparing SPECTER2 and gte-small on paper recommendation.

## LLM APIs (Claude and alternatives): summaries, "explain this abstract", review assistance; cost and safe calling from edge functions

### Takeaway
Claude Haiku 5.5 ($0.10/$0.50 per MTok) makes per-paper AI features nearly free: about $0.0003 per "explain this abstract" request. Sonnet 5.5 ($2/$10) costs about $0.006 per request and suits higher-quality review assistance. Opus 5.5 ($4/$20) is rarely needed here. Call Claude only from a Supabase edge function that verifies the Clerk JWT, rate-limits per user, and caches outputs per paper in Postgres.

### Cited Findings
Source for this section: Claude API skill reference (pricing cached 2026-10-06), which points to docs.claude.com / platform.claude.com for live prices.

**Pricing per MTok (input / output):**

| Model | Input | Output | Cache reads |
|---|---|---|---|
| Claude Opus 5.5 (`claude-opus-5-5`) | $4.00 | $20.00 | $0.20 |
| Claude Sonnet 5.5 (`claude-sonnet-5-5`) | $2.00 | $10.00 | $0.20 |
| Claude Haiku 5.5 (`claude-haiku-5-5`) | $0.10 | $0.50 | — |

- Haiku 5.5 prices apply to prompts up to 100K tokens. Beyond that it is $0.50 input / $2.50 output.
- All three models have a 1M-token context window.
- Use only these exact model IDs, with no date suffixes.

**Discounts:**
- Batch API (`/v1/messages/batches`) runs asynchronously at 50% cost.
- Prompt caching: cache writes cost about 1.25x and cache reads about 0.1x. The default TTL is 5 minutes, with an optional `ttl: "1h"`. The minimum cacheable prefix is 512–4096 tokens depending on the model.

**API behavior changes:**
- **Opus 5.5:** thinking cannot be disabled, and `effort` defaults to `medium`. Forced `tool_choice` `any`/`tool` returns a 400. Use structured outputs (`output_config.format`) for JSON.
- **Sonnet 5.5:** `thinking: {type: "disabled"}` returns a 400. Use `{type: "between_tools"}` or low effort instead.
- **Haiku 5.5:** thinking is on by default, and `effort` defaults to `medium`.
- **All three:** assistant prefill returns a 400.
- **Sampling parameters:** from 2026-10-21, sending `temperature`, `top_p` or `top_k` returns a 400 on every model. This is relevant to any older code.
- **Refusals:** Opus 5.5 and Sonnet 5.5 can return `stop_reason: "refusal"`. The server-side `fallbacks` parameter (beta `server-side-fallback-2026-07-01`, `fallbacks: "default"`) handles it.

**Other alternatives:**
- Elicit: an aggregator lists API access on the Pro plan ($49/mo per user, billed annually) and "unlimited API access" on Enterprise (custom pricing). This is a secondary source marked as verified June 2026. — [aiproductivity.ai Elicit pricing](https://aiproductivity.ai/pricing/elicit/)
- Consensus: no confirmed public API, described as "coming soon" on a comparison site. — [CostBench Consensus vs Elicit](https://costbench.com/compare/consensus-vs-elicit/)

### Inferences
- **Per-request cost**, assuming about 1,500 input tokens (a system prompt plus a title and abstract) and about 300 output tokens:
  - Haiku 5.5: 1,500×$0.10/1M + 300×$0.50/1M ≈ **$0.0003**
  - Sonnet 5.5: ≈ $0.003 + $0.003 = **$0.006**
  - Opus 5.5: ≈ $0.006 + $0.006 = **$0.012**
- **Cost at scale.** Thinking tokens bill as output, so set `effort: "low"` for these simple tasks to keep output near these estimates. At 10k AI requests a month, Haiku costs about $3 and Sonnet about $60. Because summaries are per paper rather than per user, caching the generated summary in a `paper_ai_summaries` table means each paper is summarized roughly once. A nightly Batch API job can pre-generate summaries for newly shelved papers at 50% off.
- **Feature-to-model mapping:**
  - Haiku 5.5 for "explain this abstract", "ELI5" and key-takeaways bullets.
  - Sonnet 5.5 for review assistance (critique a draft review, suggest structure) and multi-paper comparison.
  - Prefer S2 TLDRs, when license-permitted, as a free one-line summary before calling an LLM.
- **Safe-calling pattern for the Supabase edge function (Deno):**
  1. Store `ANTHROPIC_API_KEY` with `supabase secrets set` and never ship it to the Vite client.
  2. Verify the Clerk session JWT in the function, using Clerk JWKS or `@clerk/backend` `verifyToken`, before calling Claude.
  3. Enforce a per-user daily quota with a Postgres counter table or RPC, and a global spend cap.
  4. Check `paper_ai_summaries` before calling and insert after.
  5. Use `npm:@anthropic-ai/sdk` in Deno and stream the response to the client for "explain" UX.
  6. Treat abstracts and user review text as untrusted data: put them in delimited user content, not the system prompt, and do not let output trigger actions.
  7. Restrict CORS on the function to peerly.io origins.
  8. Handle `stop_reason` values `refusal` and `max_tokens`.
  9. Show an "AI-generated" label, and do not present AI text as the author's abstract.
- **Alternatives.** Elicit is a consumer research assistant, not a building-block API, and its pricing is per seat. Calling an LLM directly is far cheaper and more controllable for Peerly.

### Gaps
- I did not fetch live docs.claude.com pricing pages this session; the figures come from the skill reference cached 2026-10-06.
- I did not research OpenAI, Google Gemini or Mistral pricing for Oct 2026, so no head-to-head comparison is available.
- No official Elicit API documentation, rate limits or terms were found. Consensus API status is unconfirmed.

## Other discovery sources: Connected Papers, ResearchRabbit, Litmaps, CORE, Elicit, Consensus

### Takeaway
None of Connected Papers, ResearchRabbit or Litmaps has a documented public developer API, so the practical route is to replicate their core ideas (co-citation and bibliographic coupling over the S2 and OpenAlex citation graphs) or to deep-link to them. CORE has a free, heavily throttled v3 API, useful mainly for open-access full text, and I found no evidence of a public recommender endpoint.

### Cited Findings
- Connected Papers builds graphs from the Semantic Scholar corpus using bibliographic coupling and co-citation. Litmaps claims a 270M+ paper catalogue and supports BibTeX/RIS import. ResearchRabbit claims 310M+ papers. One secondary source says ResearchRabbit was acquired by Litmaps in May 2025 (unverified). None of the sources mention a public API. — [IntuitionLabs guide](https://intuitionlabs.ai/articles/ai-literature-mapping-tools-guide); [ResearchRabbit Notion guide](https://researchtoolkits.notion.site/Research-Rabbit-29a481e7712280399203ff336a1e3733)
- CORE API: free with no registration, subject to rate limits of "one batch request or five single requests per 10 seconds". Registration gives faster rates, which are typically paid but free for Supporting and Sustaining members and for academics at member institutions. The endpoint is `https://api.core.ac.uk/v3/search/works?q=` with a Bearer key. — [CORE API services page](https://core.ac.uk/services/api); [CORE driver via Glama](https://glama.ai/mcp/servers/@benedict2310/Scientific-Papers-MCP/blob/646da8d8af653f6b833f3725bae4cafc38a9428e/src/drivers/core-driver.ts)
- Elicit and Consensus: see the previous section. Elicit API access is tied to paid seats, per a secondary source, and the Consensus API is unconfirmed.

### Inferences
- **Do-it-yourself Connected Papers.** For a seed paper, fetch its references and citations (S2 `/citations` and `/references`, or OpenAlex `referenced_works` plus `filter=cites:W...`). Score candidates by co-citation and shared-reference counts, then render a small graph (for example with react-force-graph). This is feasible within S2 and OpenAlex budgets if computed lazily and cached per seed.
- **Deep links.** A low-effort alternative is "Open in Connected Papers" (`connectedpapers.com/api/redirect/doi/{doi}`, a URL pattern from prior knowledge that needs verifying) and "Open in Litmaps" buttons.
- **CORE's value.** CORE's role for Peerly is OA full-text and PDF links, not recommendations. Its anonymous rate (about 0.5 req/s) requires server-side caching.

### Gaps
- No official statements were found from Connected Papers, ResearchRabbit or Litmaps on API availability or partnerships. Absence of evidence is not definitive, so contact them directly if needed.
- CORE's commercial-use terms and whether its recommender is still offered as an API or plugin were not confirmed.
- The ResearchRabbit–Litmaps acquisition claim is unverified.
