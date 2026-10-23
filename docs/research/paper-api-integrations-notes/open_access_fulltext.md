# Open-access, full-text/PDF and preprint APIs for Peerly

Method note: besides reading docs, I sent live requests to each API on 2026-10-23 with `curl -H "Origin: https://peerly.io"` and checked status codes, CORS headers and rate-limit headers. Results marked "live probe 2026-10-23" come from these requests. They show what the servers did that day, not what any documentation promises.

## Q1: What each API returns, endpoints, example request/response, and auth

### Takeaway
Unpaywall (DOI to best OA PDF link, email only) and Europe PMC (search plus per-record `fullTextUrlList` with PDF links, covering both journal articles and preprints, no auth) are the two most useful additions. arXiv and bioRxiv/medRxiv add preprint coverage. CORE adds repository full text but needs an API key for full text. DOAJ, HAL, Zenodo and OpenAIRE are niche supplements. SSRN has no public API. The PMC OA Web Service was shut down in August 2026.

### Cited Findings

**Unpaywall**
- Endpoint: `GET https://api.unpaywall.org/v2/{DOI}?email=you@example.com`. It returns the OA record for the article. There is also a Simple Query Tool for up to 1,000 DOIs. No search endpoint is documented; search requests are pointed to OpenAlex — [OpenAlex help: Unpaywall](https://help.openalex.org/access/unpaywall.md)
- Auth: an `email` query parameter, no key. Live probe 2026-10-23: `email=test@example.com` returned HTTP 422 `"Please use your own email address in API calls."`, so placeholder/example emails are rejected. A real email returned 200 — live probe `api.unpaywall.org/v2/10.1038/nature12373`
- Response shape (live probe 2026-10-23, abridged): `{doi, doi_url, is_oa, genre, journal_name, journal_issn_l, journal_is_oa, journal_is_in_doaj, has_repository_copy, is_paratext, best_oa_location:{url, url_for_pdf, url_for_landing_page, host_type:"publisher"|"repository", version:"publishedVersion"|..., license, oa_date, evidence, updated, is_best, pmh_id, endpoint_id, repository_institution}, first_oa_location, oa_locations:[...], data_standard:2}`. In the live response, `evidence` and `updated` held the literal string `"deprecated"`.
- Coverage: Crossref DOIs only. DataCite DOIs (for example Zenodo and many datasets) and other-agency DOIs return 404 — [OpenAlex help: Unpaywall](https://help.openalex.org/access/unpaywall.md)
- Unpaywall and OpenAlex come from the same team and have run on one database since late 2025. Unpaywall is a "legacy-compatible format" over that data. `is_oa`, `oa_status` and the PDF link match OpenAlex's `open_access` and `best_oa_location` fields — [OpenAlex help: Unpaywall](https://help.openalex.org/access/unpaywall.md)

**Europe PMC REST API**
- Search: `GET https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:10.1371/journal.pone.0000308&format=json&resultType=core`. Live probe 2026-10-23 returned `{id, source:"MED", pmid, pmcid:"PMC1817752", doi, isOpenAccess:"Y", inEPMC, inPMC, hasPDF:"Y", license:"cc by", fullTextUrlList:{fullTextUrl:[{availability:"Open access", availabilityCode:"OA", documentStyle:"pdf", site:"Europe_PMC", url:"https://europepmc.org/articles/PMC1817752?pdf=render"}, ...]}}`. The response reported API `"version":"6.9"`.
- Preprints: `query=... AND SRC:PPR` returns preprints (ids like `PPR1343961`, `pubType:"preprint"`). Live probe: "crispr AND SRC:PPR" gave 13,961 hits; `SRC:PPR AND HAS_FT:Y` gave 76,572 preprints with full text, with PDF links like `https://europepmc.org/api/fulltextRepo?pprId=PPR1326190&type=FILE&fileName=...pdf`. Pagination uses `cursorMark`/`nextCursorMark`.
- Full text XML: `GET https://www.ebi.ac.uk/europepmc/webservices/rest/{PMCID}/fullTextXML` returned 200 `application/xml` for PMC1817752 (live probe).
- Auth: none needed (live probe).

**arXiv API**
- Endpoint: `GET https://export.arxiv.org/api/query?search_query=all:electron&start=0&max_results=10`, or `?id_list=2301.00001`. It returns an Atom XML feed. Each `<entry>` has `id`, `title`, `summary`, `updated`/`published`, authors, an abs link, and `<link rel="related" type="application/pdf" href="https://arxiv.org/pdf/...">` — live probe 2026-10-23
- At most 2,000 results per call and 30,000 total. Requests for more than 30,000 return HTTP 400. Use OAI-PMH for bulk harvesting — [arXiv API User Manual](https://info.arxiv.org/help/api/user-manual.html)
- Auth: none.

**bioRxiv / medRxiv API** (`https://api.biorxiv.org`)
- `/details/[server]/[interval]/[cursor]/[format]` and `/details/[server]/[DOI]/na/[format]` return `doi, title, authors, author_corresponding, author_corresponding_institution, date, version, type, license, category, jatsxml, abstract, published, server`, 30 per call. `/pubs/[server]/...` maps preprints to published versions (`biorxiv_doi, published_doi, published_journal, ...`), 100 per call. There are also `/publisher`, `/funder` (ROR, from 2025-04-10), `/sum` and `/usage` endpoints. **There is no keyword search endpoint.** — [api.biorxiv.org](https://api.biorxiv.org/)
- Example: `GET https://api.biorxiv.org/details/biorxiv/2d` returned `{"messages":[{"status":"ok"}],"collection":[{title, authors, doi:"10.64898/2026.08.12.744382", date, version, type, license:"cc_by", category, jatsxml, ...}]}` — live probe 2026-10-23
- **DOI prefix change:** bioRxiv/medRxiv articles posted from 1 Dec 2025 get the prefix `10.64898`. Older ones keep `10.1101` — [openRxiv: Understanding DOIs for preprints](https://connect.biorxiv.org/news/2025/11/18/preprint_dois). Some secondary guides still say all medRxiv/bioRxiv DOIs use 10.1101, which is now outdated — [CASRAI summary](https://casrai.org/wp/tag/biorxiv-doi-prefix/)
- Auth: none.

**CORE API v3** (`https://api.core.ac.uk/v3/`)
- Endpoints: `/search/works/?q=...` (note the trailing slash: without it the API returns a 301), `/works/{id}`, `/outputs/{id}`, and a discovery endpoint. Work records include `downloadUrl`, `fullText` (text extracted from the crawled PDF with Apache PDFBox), `arxivId`, `doi`, `dataProviders`, `citationCount`, and others — [CORE API v3 docs](https://api.core.ac.uk/docs/v3); live probe returned `{"totalHits":1467525,"results":[{arxivId, authors, outputs:[...], dataProviders:[{id:324,name:"ZENODO"}], ...}]}`
- Auth: API key (Bearer `Authorization` header) from the registration form. Unauthenticated use works but "Full-text is not available for unauthenticated API users" — [CORE API v3 docs](https://api.core.ac.uk/docs/v3)

**DOAJ**
- `GET https://doaj.org/api/search/articles/doi:{DOI}` returns `{total, results:[{bibjson:{identifier, journal:{title, publisher, issns, ...}, link:[...], ...}}]}`. The docs reference API `v4`. No auth is needed for search — live probe 2026-10-23; [DOAJ API docs](https://doaj.org/api/docs)

**HAL** (French national repository)
- Solr search: `GET https://api.archives-ouvertes.fr/search/?q=...&fl=halId_s,title_s,fileMain_s,doiId_s,openAccess_bool&wt=json`. `fileMain_s` is the main PDF URL. No auth — live probe 2026-10-23

**Zenodo**
- `GET https://zenodo.org/api/records?q=...&size=N` returns `{hits:{hits:[...], total}, aggregations}`. No auth for reads — live probe 2026-10-23. Zenodo DOIs are DataCite DOIs, so Unpaywall does not cover them — [OpenAlex help: Unpaywall](https://help.openalex.org/access/unpaywall.md)

**OpenAIRE Graph API** (an alternative not on the original list)
- `GET https://api.openaire.eu/graph/v1/researchProducts?search=...&pageSize=N` returned 200 with no auth — live probe 2026-10-23

**PubMed Central OA Web Service: DISCONTINUED**
- "the PMC OA Web Service is no longer available". The page was last modified 19 Aug 2026 — [PMC OA Service page](https://pmc.ncbi.nlm.nih.gov/tools/oa-service/). Live probe of the old `https://www.ncbi.nlm.nih.gov/pmc/utils/oa/oa.fcgi?id=PMC5334499` returned 404.
- Replacement: the PMC Cloud Service on AWS. Every article file (XML, TXT, PDF, media) is available individually, with no compressed or bulk packages. Access is free over HTTPS/S3 with no login. FTP legacy files were removed in August 2026 — [NLM Technical Bulletin: Changes to PMC Article Dataset Distribution 2026](https://www.nlm.nih.gov/pubs/techbull/jf26/jf26_Changes_to_PMC_ArtDsDistribServs_2026.html)
- New layout: `s3://pmc-oa-opendata/PMC10009416.1/PMC10009416.1.{json,pdf,txt,xml}`, served over HTTPS at `https://pmc-oa-opendata.s3.amazonaws.com/...`. Each per-article JSON includes `xml_url` and `pdf_url` (if a PDF exists) — [PMC AWS README](https://pmc-oa-opendata.s3.amazonaws.com/README.txt)
- The PMC ID Converter moved to `https://pmc.ncbi.nlm.nih.gov/tools/idconv/api/v1/articles/?ids={DOI}&format=json`. The old `www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/` URL now 301-redirects there — live probe 2026-10-23

**SSRN**
- I found no public SSRN API. SSRN is owned by Elsevier. Elsevier's developer APIs give non-subscribers only basic metadata and search, with fuller access limited to subscriber networks — [Elsevier Developer Portal](https://dev.elsevier.com/about.html); [Library Technology Guides on the acquisition](https://librarytechnology.org/pr/21606)

### Inferences
- Peerly can probably surface free PDFs for many PubMed papers without adding a new provider: Europe PMC's `fullTextUrlList` already covers PMC articles. The `pdf_url` from the PMC S3 JSON is a second route.
- Peerly already uses OpenAlex and Semantic Scholar, and both have OA fields that may be unused: OpenAlex `best_oa_location`/`open_access` (the same data as Unpaywall, per the OpenAlex help page) and Semantic Scholar `openAccessPdf`. Peerly should check whether these are requested before adding Unpaywall as a separate call. I did not inspect Peerly's code to confirm.
- Any DOI regex or detection logic that assumes bioRxiv = `10.1101` will miss preprints posted since Dec 2025.

### Gaps
- I did not test a HAL query that returns a hit (my test DOI returned 0 results), so I have not confirmed the `fileMain_s` field values.
- I did not verify the exact CORE "discover by DOI" endpoint path in the docs text.

## Q2: Rate limits, terms, CORS (browser vs proxy), pricing, commercial use

### Takeaway
Europe PMC, Unpaywall, bioRxiv, DOAJ, HAL, Zenodo and OpenAIRE all returned `Access-Control-Allow-Origin: *`, so the browser can call them directly. arXiv returned no CORS header, so it needs a Supabase edge-function proxy. CORE should also go through a proxy so the API key stays out of the browser and because its preflight responses did not include an allow-origin header. Everything here is free to call. Commercial-use terms are explicit only for arXiv (metadata is CC0) and PMC data (redistribute only licensed content).

### Cited Findings

**CORS (live probe 2026-10-23, `Origin: https://peerly.io`)**

| API | `Access-Control-Allow-Origin` |
|---|---|
| api.unpaywall.org | `*` |
| ebi.ac.uk/europepmc | `*` |
| api.biorxiv.org | `*` |
| doaj.org/api | `*` |
| zenodo.org/api | `*` (also exposes `X-RateLimit-*` headers) |
| api.archives-ouvertes.fr (HAL) | `*` |
| api.openaire.eu | `*` |
| export.arxiv.org | **none**. A browser fetch will be blocked, so use a proxy. |
| api.core.ac.uk | **none on GET**. The OPTIONS preflight returned `allow-credentials: true` and `allow-headers: authorization` but no allow-origin. |

**Rate limits and terms**
- **arXiv:** "make no more than one request every three seconds", across all machines you control, and "limit requests to a single connection at a time". Contact arXiv for higher rates. Metadata is CC0 1.0. Do not store and serve arXiv PDFs or source from your own servers unless the license permits it; link to arXiv instead. Do not imply arXiv endorses your service. The terms page does not address commercial use — [arXiv API Terms of Use](https://info.arxiv.org/help/api/tou.html)
- **CORE:** token-based limits. Unauthenticated users get 100 tokens/day, max 10/minute, with no full text. Registered personal users get 1,000 tokens/day, max 25/minute. Higher tiers go up to about 200k tokens/day, and a VIP tier is custom. Recommender, scroll and bulk calls cost more tokens. Response headers are `X-RateLimit-Remaining`, `X-RateLimit-Retry-After` and `X-RateLimit-Limit` — [CORE API v3 docs](https://api.core.ac.uk/docs/v3). Live probe showed `x-ratelimit-limit: 10` unauthenticated. I could not load CORE's commercial-use terms: core.ac.uk/services/api returned 403 to my fetcher.
- **Zenodo:** the live probe showed `x-ratelimit-limit: 30` with a reset/`retry-after: 59`, which suggests about 30 requests/minute unauthenticated. This is inferred from headers, not docs.
- **OpenAIRE Graph:** the live probe showed `x-ratelimit-limit: 7199`. The time window was not stated in the headers.
- **PMC Cloud data:** free, with no fees. Users must acknowledge NLM as the source, must not use the PMC logo or wordmark, must not imply NLM endorsement, and may redistribute only data licensed for redistribution — [PMC AWS README](https://pmc-oa-opendata.s3.amazonaws.com/README.txt)
- **Unpaywall:** the current help page states no rate limit, pricing or commercial terms for the REST API. The DOI API, extension and Data Feed are described as "unchanged" — [OpenAlex help: Unpaywall](https://help.openalex.org/access/unpaywall.md). The long-cited figure of 100k calls/day could not be confirmed from a current page (unpaywall.org/products/api would not render for my fetcher).
- **OpenAlex context** (relevant because Unpaywall shares its backend): secondary sources say OpenAlex made API keys mandatory and introduced usage-based pricing in February 2026, with about $1/day of free usage with a free key; single-record lookups are free, list calls cost about $0.0001 and search calls about $0.001 — [jwatte.com blog](https://jwatte.com/blog/openalex-open-index-of-research/); [casrai.org](https://casrai.org/news/openalex-api-keys-mandatory-usage-based-pricing-2026). These sources are secondary and need checking against developers.openalex.org, because Peerly already uses OpenAlex.
- **Elsevier/SSRN:** free API key, but full access is limited to subscribers — [Elsevier Developer Portal](https://dev.elsevier.com/about.html)

### Inferences
- Peerly's current pattern of calling APIs directly from the browser works for Unpaywall, Europe PMC, bioRxiv, DOAJ, HAL and Zenodo. arXiv (no CORS, and a 1 request per 3 seconds limit that is global across all Peerly users) and CORE (secret key) belong in a Supabase edge function with caching. Calling arXiv from many users' browsers would fail on CORS anyway, and through a proxy it needs a serialized queue.
- The Unpaywall `email` should be a Peerly contact address hard-coded in config, not the end user's email.
- Linking out to PDFs (instead of re-hosting them) keeps Peerly within the arXiv and PMC terms.

### Gaps
- Europe PMC's documented rate limit and terms could not be extracted: europepmc.org pages served a Cloudflare challenge to my fetcher.
- I could not retrieve CORE's commercial-licensing terms or pricing, or a current official Unpaywall rate limit.
- DOAJ's read rate limit was mentioned on its docs page but I did not extract the number.
- HAL and Zenodo terms of use were not reviewed.

## Q3: Best coverage for "find a free PDF for this DOI" and for preprint search

### Takeaway
For DOI-to-PDF lookups, use a cascade: Unpaywall `best_oa_location.url_for_pdf` (or the matching OpenAlex/Semantic Scholar OA fields Peerly already fetches), then Europe PMC `fullTextUrlList` for biomedical papers, then arXiv when the record has an arXiv ID, with CORE as an optional long-tail fallback. For preprint search, Europe PMC `SRC:PPR` is the only single, CORS-enabled keyword search across many preprint servers. arXiv adds physics, CS and math. bioRxiv's own API cannot do keyword search.

### Cited Findings
- OpenAlex says Unpaywall "remains a good fit" for DOI-to-OA lookups and that search should use OpenAlex — [OpenAlex help: Unpaywall](https://help.openalex.org/access/unpaywall.md)
- Unpaywall excludes DataCite DOIs (for example Zenodo), so Zenodo and DataCite items need their own lookup — [OpenAlex help: Unpaywall](https://help.openalex.org/access/unpaywall.md)
- Europe PMC returns direct OA PDF URLs plus license and `hasPDF` flags, and indexes preprints with full text (76,572 with `HAS_FT:Y` on 2026-10-23) — live probe
- The bioRxiv API has no keyword search. Its endpoints are date ranges, DOI lookups and category filters only — [api.biorxiv.org](https://api.biorxiv.org/)
- arXiv returns PDF links directly in its Atom entries and supports field search (`ti:`, `au:`, `abs:`, `all:`) — live probe; [arXiv API User Manual](https://info.arxiv.org/help/api/user-manual.html)
- CORE aggregates repository content and returns `downloadUrl`/`fullText`, with full text only for registered keys — [CORE API v3 docs](https://api.core.ac.uk/docs/v3)

### Inferences
- The best value for the least effort is likely to (1) read OA PDF fields from APIs Peerly already calls, (2) add Unpaywall for DOIs where those are empty, and (3) add Europe PMC for biomedical full text and preprint search, with both called directly from the browser.
- bioRxiv's `/pubs` endpoint is useful for a "this preprint was published as..." link, connecting preprint and journal versions on shelves.

### Gaps
- I found no independent, current (2026) study comparing coverage (the share of DOIs with a found OA PDF) across Unpaywall, CORE and Europe PMC.

## Q4: Reliability and maintenance status as of October 2026

### Takeaway
Two big 2026 changes matter. NCBI retired the PMC OA Web Service and FTP packages (August 2026). Unpaywall now runs on the shared OpenAlex database (since late 2025), and some of its fields now return `"deprecated"`. bioRxiv/medRxiv changed DOI prefix (December 2025). Third-party blogs that report an "arXiv API rate limit change" in October 2026 misread a submission policy.

### Cited Findings
- **PMC:** the OA Web Service is discontinued. FTP article datasets moved in March 2026 and legacy files were removed in August 2026. The updated AWS Cloud Service is now primary, and its XML is identical to OAI-PMH and eFetch output — [NLM Tech Bulletin](https://www.nlm.nih.gov/pubs/techbull/jf26/jf26_Changes_to_PMC_ArtDsDistribServs_2026.html); [PMC OA Service page](https://pmc.ncbi.nlm.nih.gov/tools/oa-service/)
- **Unpaywall:** the database was rewritten on 20 May 2025 — [OpenAlex blog: Major Update to Unpaywall Database](https://blog.openalex.org/?p=3811). It has run on the same database as OpenAlex since late 2025, and the Data Feed is kept mainly for existing integrations; new syncs should use OpenAlex-native methods — [OpenAlex help: Unpaywall](https://help.openalex.org/access/unpaywall.md). Live probe: `evidence` and `updated` fields now hold the string `"deprecated"`.
- **bioRxiv/medRxiv:** new DOI prefix `10.64898` from 1 Dec 2025 — [openRxiv](https://connect.biorxiv.org/news/2025/11/18/preprint_dois). The API still works and serves new-prefix DOIs (live probe).
- **arXiv:** the October 2026 blog post, retrieved directly, is about *submissions*. It "limits submitters to up to two submissions per calendar month, with a limit of three total active submissions at any given time", and says "this rate limit is for submissions, not announced papers" — [arXiv blog, 2026-10-01](https://blog.arxiv.org/2026/10/01/updated-rate-limit-policy/). Third-party posts that describe it as stricter API or bulk-download caps — [promptzone.com](https://www.promptzone.com/joaquin_korhonen/arxiv-rate-limit-policy-updated-october-2026-335m.md); [kunalganglani.com](https://www.kunalganglani.com/blog/arxiv-rate-limit-policy) — **conflict with the primary source and appear wrong**. The API terms still say 1 request per 3 seconds — [arXiv API ToU](https://info.arxiv.org/help/api/tou.html). arXiv API responses are now served through Google Frontend and Fastly/Varnish caching (`server: Google Frontend`, `x-cache` headers in the live probe).
- **CORE:** working (200) on 2026-10-23. `/search/works` without a trailing slash 301-redirects to `/search/works/` — live probe
- **Europe PMC:** working; response reports `"version":"6.9"` — live probe
- **DOAJ:** working; docs reference API v4 — live probe; [DOAJ API docs](https://doaj.org/api/docs)
- **OpenAlex:** secondary sources report mandatory API keys and usage pricing from February 2026 (see Q2). This may affect Peerly's existing integration and any plan to use OpenAlex's OA fields instead of Unpaywall.

### Inferences
- Any Peerly code or plan that uses `oa.fcgi` or PMC FTP `.tar.gz` packages is now broken. Use Europe PMC links or the `pmc-oa-opendata` S3 `pdf_url` instead.
- Peerly should not depend on Unpaywall's `evidence` or `updated` fields.

### Gaps
- I found no outage reports or status-page history for these APIs in 2026, and did not check GitHub issue trackers in depth.
- I could not confirm the OpenAlex pricing details from the official OpenAlex docs.
