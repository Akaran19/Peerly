# Metadata Enrichment, Identity and Research-Integrity APIs for Peerly

Method note: Alongside web research, live HTTP probes were run on 2026-10-23 with an `Origin: https://peerly.io` header. They checked status codes, CORS headers, rate-limit headers and response shapes. Findings marked "(live probe 2026-10-23)" come from those requests, not from documentation. They are cited to the endpoint URL that was called.

## What each API returns: endpoints, request/response shape, auth, rate limits, CORS, pricing and commercial terms

### Takeaway
Seven sources are free, keyless and browser-callable (CORS on): ORCID public reads, ROR, DataCite, OpenCitations, iCite, DOAJ and scite's `/tallies`. So are the existing Crossref and OpenAlex retraction fields. Altmetric now requires a key, and its free use is non-commercial only. PlumX needs a Scopus subscription, Dimensions is free only for non-commercial use, and Sherpa Romeo data appears to be NC-licensed and blocks anonymous calls. ORCID's free Public API is formally non-commercial, which matters if Peerly earns revenue.

### Cited Findings

**ORCID (author profiles plus sign-in)**
- The public record endpoint is `GET https://pub.orcid.org/v3.0/{orcid}/record`, with sub-resources such as `/works`. It returns JSON with `Accept: application/json`, has `access-control-allow-origin: *`, and works without a token for basic reads (live probe 2026-10-23) — [ORCID pub API](https://pub.orcid.org/v3.0/0000-0002-1825-0097/record)
- ORCID is a standard OpenID Connect provider: `authorization_endpoint https://orcid.org/oauth/authorize`, `token_endpoint https://orcid.org/oauth/token`, `userinfo https://orcid.org/oauth/userinfo`, and `jwks https://orcid.org/oauth/jwks`. The only scope is `openid`, and the claims are `sub` (the ORCID iD), `name`, `given_name` and `family_name` (live probe 2026-10-23) — [ORCID OIDC discovery](https://orcid.org/.well-known/openid-configuration)
- The Public API terms define non-commercial use: "you may not make use of the public APIs in connection with any revenue-generating product or service". Public API credentials are granted to individuals, not organizations — [ORCID Public Client Terms](https://info.orcid.org/public-client-terms-of-service/)
- Production use of the Member API needs a paid ORCID membership, while sandbox Member credentials are free. A third-party summary says simple sign-in buttons usually need only the Public API — [ORCID FAQ: public vs member](https://info.orcid.org/ufaqs/what-are-the-differences-between-the-public-and-member-apis); [API Evangelist summary](https://providers.apievangelist.com/providers/orcid/)
- Limits: the registered Public API allows 12 req/s with a burst of 40, and 100k reads/day per client ID. The Member API has no daily quota — [ORCID FAQ: API limits](https://info.orcid.org/ufaqs/what-are-the-api-limits/)
- ORCID may introduce fees for the Public API with advance notice, and no fees are applied retroactively without consent — [ORCID Public Client Terms](https://info.orcid.org/public-client-terms-of-service/)

**ROR (Research Organization Registry: institutions)**
- `GET https://api.ror.org/v2/organizations?query=stanford` and `GET https://api.ror.org/v2/organizations/{ror_id}` return v2 schema JSON (`items[]` with `names`, `domains`, `established`, `external_ids` such as GRID/ISNI/FundRef/Wikidata, `locations`, `links`, `relationships`). The response has `access-control-allow-origin: *` and no key is needed. Records showed `schema_version: "2.1"` (live probe 2026-10-23) — [ROR API](https://api.ror.org/v2/organizations?query=stanford)
- ROR's August 2024 announcement: the API has been free with no registration since 2019 and is IP-limited to 2,000 requests per 5 minutes. ROR proposed a client ID header to keep that limit, with unidentified requests dropping to 50 per 5 minutes — [ROR blog, 2024-08-29](https://ror.org/blog/2024-08-29-api-client-identification/)
- No rate-limit headers were returned on an anonymous request (live probe 2026-10-23) — [ROR API](https://api.ror.org/v2/organizations/00f54p054)

**DataCite (datasets, software and other non-Crossref DOIs)**
- `GET https://api.datacite.org/dois/{doi}` returns JSON:API (`data.attributes` with `creators`, `publisher`, `types.resourceTypeGeneral` such as Dataset or Software, `relatedIdentifiers` such as `IsCitedBy`/`IsSupplementTo`, `citationCount`, `viewCount`, `downloadCount`). The CORS header echoes the origin (`access-control-allow-origin: https://peerly.io`). No key is needed for reads. A sample Dryad DOI showed `citationCount:1, viewCount:462, downloadCount:38` (live probe 2026-10-23) — [DataCite API](https://api.datacite.org/dois/10.5061/dryad.8515)

**OpenCitations (Index v2 citations, Meta v1 bibliographic data)**
- Index v2 operations (all GET, base `https://api.opencitations.net/index/v2`): `/citation/{oci}`, `/citation-count/{id}`, `/venue-citation-count/{issn}`, `/reference-count/{id}`, `/citations/{id}`, `/references/{id}`. IDs are prefixed, e.g. `doi:` — [OpenCitations Index API v2](https://api.opencitations.net/index/v2)
- No token is required, but an access token in the `authorization` header is encouraged for apps. The limit is "180 requests/minute per IP address", and dumps are recommended for bulk use — [OpenCitations Index API v2](https://api.opencitations.net/index/v2)
- `citation-count` returns `[{"count":"1806"}]` for doi:10.1038/nature12373 (the count is a string), with `access-control-allow-origin: *` (live probe 2026-10-23) — [OpenCitations citation-count](https://api.opencitations.net/index/v2/citation-count/doi:10.1038/nature12373)
- Meta v1 `GET https://api.opencitations.net/meta/v1/metadata/doi:{doi}` returns `id` (cross-mapped doi, openalex, pmid and omid), `title`, and `author` with inline ORCIDs (live probe 2026-10-23) — [OpenCitations Meta](https://api.opencitations.net/meta/v1/metadata/doi:10.1038/nature12373)
- The Index and Meta data are CC0. As of July 2025 the Index held more than 2.2 billion citations from five sources — [OpenAIRE OpenCitations guide](https://www.openaire.eu/opencitations-guide); [OpenCitations Meta paper (arXiv)](https://arxiv.org/abs/2306.16191)

**NIH iCite (biomedical citation metrics)**
- `GET https://icite.od.nih.gov/api/pubs?pmids=1,2,3` returns `data[]` with `pmid`, `doi`, `title`, `year`, `journal`, `citation_count`, `relative_citation_ratio` (RCR), `nih_percentile`, `field_citation_rate`, `expected_citations_per_year`, `citations_per_year`, `apt` (Approximate Potential to Translate), `human`/`animal`/`molecular_cellular` fractions, `is_clinical`, `citedByClinicalArticle`, `provisional`, `cited_by`, `references`, and `citedByPmidsByYear`. The CORS header echoes the origin, and no key is needed (live probe 2026-10-23) — [iCite API](https://icite.od.nih.gov/api/pubs?pmids=23456789)
- A request with 1,100 PMIDs returned HTTP 413, so the batch size is capped somewhere below 1,100. The documented cap is believed to be 1,000 but could not be confirmed (live probe 2026-10-23) — [iCite API](https://icite.od.nih.gov/api/pubs)
- iCite covers PubMed-indexed papers only, so it needs a PMID. Peerly already resolves PMIDs through PubMed E-utilities.

**Crossref retractions / Retraction Watch (an existing API with an endpoint apps often miss)**
- Retraction Watch data is merged into the Crossref REST API. Retractions appear in `update-to` on the notice and are tagged `source: "publisher"` or `"retraction-watch"`. The example filter is `https://api.crossref.org/v1/works?filter=update-type:retraction`. The data is also a CSV on GitLab (`gitlab.com/crossref/retraction-watch-data`), updated once per working day — [Crossref RW documentation](https://www.crossref.org/documentation/retrieve-metadata/retraction-watch/); [Crossref blog](https://www.crossref.org/blog/retraction-watch-retractions-now-in-the-crossref-api/)
- CSV fields: Record ID, Title, Subject, Institution, Journal, Publisher, Country, Author, URLS, ArticleType, RetractionDate, RetractionDOI, RetractionPubMedID, OriginalPaperDate, OriginalPaperDOI, OriginalPaperPubMedID, RetractionNature, Reason, Paywalled, Notes — [Crossref RW documentation](https://www.crossref.org/documentation/retrieve-metadata/retraction-watch/)
- **What to check on a paper page:** on the retracted paper's own record, `GET /works/{doi}` returns an `updated-by[]` array. For the Wakefield Lancet paper it held `{type:"retraction", label:"Retraction", source:"retraction-watch", DOI:"10.1016/s0140-6736(10)60175-4", updated:{date-time:"2010-02-06..."}, record-id:"4036"}` plus an earlier `correction` (live probe 2026-10-23) — [Crossref works API](https://api.crossref.org/works/10.1016/S0140-6736(97)11096-0)
- Crossref staff say no filter directly returns retracted works. Use `has-update:1` and inspect the results. `update-type` refers to the notice records, not the originals — [Crossref community thread](https://community.crossref.org/t/api-retraction-status-not-confirmed-at-retractiondatabase-org/15831)
- RW records can change: record 19937's RetractionNature changed from "retraction" to "expression of concern" on 2026-03-26 — [Crossref community thread](https://community.crossref.org/t/api-retraction-status-not-confirmed-at-retractiondatabase-org/15831)
- OpenAlex also exposes `is_retracted` on works. It returned `true` for the Wakefield paper (live probe 2026-10-23) — [OpenAlex works API](https://api.openalex.org/works/doi:10.1016/S0140-6736(97)11096-0?select=id,is_retracted,cited_by_count)
- The Crossref Labs API `api.labs.crossref.org/works/{doi}` returns a `cr-labs-updates` object. It did not return an `access-control-allow-origin` header on the probe, so it would need a server-side proxy (live probe 2026-10-23) — [Crossref Labs API](https://api.labs.crossref.org/works/10.1016/j.cell.2009.01.002)

**Crossmark**
- The Crossmark dialog `https://crossmark.crossref.org/dialog?doi={doi}` is live (HTTP 200) and can be linked or embedded as a button. Crossmark's underlying update data (`updated-by`, `update-to`) is what the Crossref REST API exposes (live probe 2026-10-23) — [Crossmark dialog](https://crossmark.crossref.org/dialog?doi=10.1016/S0140-6736(97)11096-0)

**Altmetric (attention scores), now key-only**
- From 10 November 2025, all Details Page API requests (Counts, Fetch, Citations) need a key. Free access continues for non-commercial research, and commercial use cases need a subscription — [Altmetric announcement](https://updates.altmetric.com/announcements/ann_vah31Uctf3Rck)
- A keyless call to `https://api.altmetric.com/v1/doi/{doi}` returned HTTP 403: "As of 10 November 2025, all users need an API key…". The response headers show `x-hourlyratelimit-limit: 720` and `x-dailyratelimit-limit: 1200`, with `access-control-allow-origin: *` (live probe 2026-10-23) — [Altmetric API](https://api.altmetric.com/v1/doi/10.1038/nature12373)
- The researcher data access program serves scientometric researchers, with responses targeted within 30 business days — [Altmetric research access](https://www.altmetric.com/research-access/)
- Free badges are for personal pages, labs, blogs and institutional repositories only. Commercial use "on a journal, search engine, or app" requires contacting Altmetric for a licence — [Altmetric free badges](https://www.altmetric.com/?p=2808); [Altmetric badge docs](https://docs.altmetric.com/badges/getting-started/)
- Precedent: in 2020 Zenodo removed Altmetric badges after its free tier was discontinued — [Zenodo blog](https://blog.zenodo.org/page/8)

**PlumX (Elsevier): paid**
- The PlumX Metrics API "is available to all API users with an active Scopus subscription". The free PlumX widgets go only to non-commercial OA journals and regional repositories, on approval — [Elsevier dev docs](https://dev.elsevier.com/documentation/PlumXMetricsAPI.wadl); [Elsevier PlumX integrate](https://www.elsevier.com/insights/metrics/plumx/integrate)

**Dimensions (Digital Science): free only for non-commercial use**
- The Dimensions Badge and Metrics API are free for internal, non-commercial use by researchers and institutions. Others "please get in touch", and publishers contact publishing@digital-science.com — [Dimensions badge integration](https://integration-dimensions-badge.digital-science.com/)

**scite.ai (Smart Citations: supporting, contrasting and mentioning)**
- `GET https://api.scite.ai/tallies/{doi}` returned `{"total":1933,"supporting":22,"contradicting":1,"mentioning":1901,"unclassified":9,"doi":"10.1038/nature12373","citingPublications":2160}` with no auth and `Access-Control-Allow-Origin: *` (live probe 2026-10-23) — [scite tallies](https://api.scite.ai/tallies/10.1038/nature12373)
- Research Solutions (NASDAQ: RSSS) acquired scite, announced 27 Nov 2023 — [Research Solutions press release](https://researchsolutions.investorroom.com/2023-11-27-Research-Solutions-Announces-Acquisition-of-scite)
- Enterprise and API access are quote-based (third-party summary) — [rfp.wiki comparison](https://www.rfp.wiki/artificial-intelligence/ai-agents-research-automation/scite/elicit)

**Sherpa Romeo / Jisc Open Policy Finder (journal OA and self-archiving policies)**
- The v2 API (`https://v2.sherpa.ac.uk/cgi/retrieve?item-type=publication&format=Json&api-key=…`) requires a registered key. The v1 API was retired on 31 July 2020 — [Symplectic support](https://support.symplectic.co.uk/en/articles/11290497); [Lyrasis notice](https://lyrasisnow.org/?p=4741)
- A keyless request returned a Jisc "Error 403" HTML block page, and the API documentation page also returned 403 to the fetcher (live probe 2026-10-23) — [Sherpa v2 retrieve](https://v2.sherpa.ac.uk/cgi/retrieve?item-type=publication&format=Json&limit=1)
- Sources give the data licence as CC BY-NC-SA 2.5 (non-commercial). One 2021 presentation says CC BY-NC-ND instead, so the sources conflict and none is a current Jisc terms page — [Lantern sources (checked 2017)](https://lantern.cottagelabs.com/sources); [rromeo package](https://www.rdocumentation.org/packages/rromeo); contradicted on ND by [Kosyakov 2021](https://conf.neicon.ru/materials/85-online0621/20210622-Kosyakov.pdf)
- A 2026 third-party page describes the service as free for research and API use, with an optional supporter scheme — [ki-syndikat](https://www.ki-syndikat.de/tools/sherpa-romeo/)

**DOAJ (Directory of Open Access Journals)**
- `GET https://doaj.org/api/search/journals/issn:{issn}` (v4 API) has `access-control-allow-origin: *` and needs no key for search. `bibjson` fields include `apc` (e.g. PLOS ONE `has_apc:true, max:[{price:2477,currency:"USD"}]`), `license[]` (CC type flags), `editorial.review_process`, `plagiarism`, `preservation`, `publication_time_weeks`, `deposit_policy`, `copyright`, `waiver`, `boai`, `oa_start`, `subject` and `language` (live probe 2026-10-23) — [DOAJ API](https://doaj.org/api/search/journals/issn:1932-6203)
- Rate limit: "two requests per second on all API routes", with bursts of up to 5 queued. API keys are mainly for publishers submitting data. The current version is v4.0.1 (21 Aug 2025) — [DOAJ API docs](https://doaj.org/api/docs)
- Licences: journal metadata is CC BY-SA 4.0 and article metadata is CC0 — [DOAJ terms](https://doaj.org/terms); [DOAJ blog 2020](https://blog.doaj.org/2020/12/14/important-changes-to-our-journal-csv-and-how-we-license-metadata)

**Crossref rate limits (affect the retraction lookups Peerly already makes)**
- New limits took effect 1 Dec 2025. The public pool allows 5 req/s for single records and 1 req/s for lists. The polite pool (`mailto=` parameter) allows 10 req/s for single records and 3 req/s for lists. A 429 response means back off — [Crossref blog](https://crossref.org/blog/announcing-changes-to-rest-api-rate-limits/); [Crossref community refinement](https://community.crossref.org/t/refining-rest-api-limits-for-improved-stability-and-reliability/16137)
- The polite-pool concurrency is stated as 3 in the original post and 5 in the implementation post, so the sources conflict — [Crossref community update](https://community.crossref.org/t/updates-to-rest-api-rate-limits/14872)
- Response headers matched the published limits: a single work without `mailto` returned `x-rate-limit-limit: 5` with `x-api-pool: public-single`, a single work with `mailto` returned 10, and a list query without `mailto` returned 1 (live probe 2026-10-23) — [Crossref works API](https://api.crossref.org/works/10.1038/nature12373)

**Unpaywall (bonus: OA links)**
- `GET https://api.unpaywall.org/v2/{doi}?email=` has `access-control-allow-origin: *`. It rejected `test@example.com` with HTTP 422 ("Please use your own email address"), so a real contact email is required (live probe 2026-10-23) — [Unpaywall API](https://api.unpaywall.org/v2/10.1038/nature12373?email=test@example.com)

### Inferences
- Browser-safe without a backend: ORCID public reads, ROR, DataCite, OpenCitations, iCite, DOAJ, scite tallies and Unpaywall all return permissive CORS headers. Calling them through a Supabase edge function with Postgres caching is still advisable, for three reasons: shared per-IP limits (OpenCitations 180/min, DOAJ 2/s, ROR possibly 50 per 5 min without a client ID), protecting keys (ORCID client secret, Altmetric, Sherpa), and the Crossref `mailto` going out with every request.
- Sherpa Romeo, the Crossref Labs API, the Altmetric key and the ORCID OAuth token exchange need a server-side proxy. Sherpa's NC licence plus its key requirement make it a poor fit for a commercial product. DOAJ supplies an overlapping signal (licence, APC, peer-review type) with clearer terms, though journal data is CC BY-SA, which requires attribution and share-alike on redistributed journal data.
- Clerk does not list ORCID as a built-in social provider (unverified). ORCID's standard OIDC discovery document suggests it could be added as a custom OIDC provider in Clerk, or linked as a verified account after Clerk sign-in. The ORCID iD returned in `sub` gives a verified link between a user account and an author.
- ORCID's "no revenue-generating product" clause is a real constraint. While Peerly is free ("make all features free while pricing is in development" per the recent commits), Public API use fits. Once paid tiers launch, Peerly should review ORCID membership.

### Gaps
- The scite API terms (commercial display rights for `/tallies`, rate limits) could not be retrieved: the docs page rendered empty. Whether keyless `/tallies` is officially supported or just tolerated is unconfirmed.
- No source confirmed whether ROR's 2024 client-ID proposal took effect, or what its current limits are.
- Current Jisc Sherpa v2 API terms could not be fetched (403). The licence rests on older or secondary sources that conflict (NC-SA vs NC-ND).
- iCite's documented batch cap, rate limits and terms could not be fetched (the docs page returned 401). Only the 413 at 1,100 PMIDs was observed.
- Altmetric's commercial pricing is not public, and no 2026-specific change beyond the Nov 2025 key requirement was found.
- No PlumX or Dimensions pricing figures were found.
- No source confirmed whether Clerk supports ORCID as a custom OIDC provider.

## Which integrations would most improve the user experience

### Takeaway
In priority order: (1) retraction and correction banners on paper pages, built from fields Peerly already fetches (Crossref `updated-by` with the Retraction Watch source, OpenAlex `is_retracted`), at zero new cost. (2) "Sign in with ORCID" for verified author profiles and claimed papers. (3) scite's supporting/contrasting counts, which suit a review site. (4) ROR institution chips and DOAJ journal badges. (5) iCite RCR for biomedical papers. Altmetric, PlumX and Dimensions attention scores are not worth pursuing for a commercial startup now.

### Cited Findings
- Retraction status is already in the Crossref response for the retracted work (`updated-by[].type == "retraction"`, `source == "retraction-watch"`, plus the notice DOI and date) — [Crossref works API](https://api.crossref.org/works/10.1016/S0140-6736(97)11096-0)
- `update-to`/`updated-by` also carries `correction` entries and RetractionNature values such as "expression of concern", so a graded banner (retracted / EoC / corrected) is feasible — [Crossref RW documentation](https://www.crossref.org/documentation/retrieve-metadata/retraction-watch/); [Crossref community thread](https://community.crossref.org/t/api-retraction-status-not-confirmed-at-retractiondatabase-org/15831)
- The Wakefield paper still has 3,009 citations in OpenAlex, which shows the value of warning readers before they rate or cite a retracted paper — [OpenAlex works API](https://api.openalex.org/works/doi:10.1016/S0140-6736(97)11096-0?select=id,is_retracted,cited_by_count)
- scite returns classified citation stances (e.g. 22 supporting, 1 contradicting, 1,901 mentioning) per DOI — [scite tallies](https://api.scite.ai/tallies/10.1038/nature12373)
- ORCID OIDC returns a verified ORCID iD (`sub`) and name — [ORCID OIDC discovery](https://orcid.org/.well-known/openid-configuration)
- iCite's RCR and NIH percentile are field-normalized metrics, and `apt`/`is_clinical` support translational badges — [iCite API](https://icite.od.nih.gov/api/pubs?pmids=23456789)
- DOAJ supplies the journal's review process, APC amount, licence, preservation and plagiarism policy. DOAJ listing is a widely used legitimacy signal against predatory journals — [DOAJ API](https://doaj.org/api/search/journals/issn:1932-6203)
- DataCite exposes linked datasets and software via `relatedIdentifiers`, plus view and download counts — [DataCite API](https://api.datacite.org/dois/10.5061/dryad.8515)
- Altmetric now blocks keyless calls, and its free badges exclude apps and search engines — [Altmetric API](https://api.altmetric.com/v1/doi/10.1038/nature12373); [Altmetric free badges](https://www.altmetric.com/?p=2808)

### Inferences
- **Highest value per effort:** a retraction/EoC/correction banner on paper pages, plus an optional warning before a user reviews a retracted paper. It is free, uses data Peerly already fetches, and improves trust directly. Peerly could mirror the daily Retraction Watch CSV into Postgres (a Supabase cron job) to flag papers in bulk and alert users who shelved a paper that was later retracted.
- **Identity:** ORCID sign-in or account linking gives "Verified author" badges, lets authors claim works (`/works` from the public API), and lets Peerly label "author responded" on reviews. Peerly should key authors on ORCID iD, cross-walked to OpenAlex author IDs, which OpenAlex already exposes.
- **Citation context:** scite stance counts ("22 supporting, 1 contrasting") complement user ratings well, but the commercial terms must be confirmed first. OpenCitations (CC0) is a safe, open fallback for a cross-check citation count and for reference/citation lists.
- **Journal pages:** a DOAJ "in DOAJ" badge with APC, licence and review type; ROR on author and institution pages (logos/links, country, Wikidata IDs); and OpenAlex `sources`/`institutions` endpoints, which Peerly already has access to.
- **Paid or avoid for now:** Altmetric (key, commercial subscription), PlumX (Scopus subscription), Dimensions (non-commercial only) and Sherpa Romeo (NC licence).

### Gaps
- No usage data was found that measures user-engagement uplift from retraction banners or attention badges on consumer research apps, so the ranking above is reasoned, not evidenced.

## Status as of October 2026 (acquisitions, shutdowns, pricing and policy changes)

### Takeaway
The main changes since 2024: Altmetric went key-only (Nov 2025); Crossref tightened rate limits (Dec 2025) and integrated Retraction Watch; DOAJ moved to API v4.0.1 (Aug 2025); ROR rolled out schema v2.1 records; and scite is owned by Research Solutions (since 2023). No shutdowns were found among the APIs reviewed. Anything Peerly has that assumes keyless Altmetric or the old Crossref limits is outdated.

### Cited Findings
- Altmetric: key required for all Details Page API calls from 10 Nov 2025, with intermittent errors from Oct 2025 — [Altmetric announcement](https://updates.altmetric.com/announcements/ann_vah31Uctf3Rck); confirmed by live 403 (2026-10-23) — [Altmetric API](https://api.altmetric.com/v1/doi/10.1038/nature12373)
- Crossref: new REST limits from 1 Dec 2025 (the first change since 2013) — [Crossref blog](https://crossref.org/blog/announcing-changes-to-rest-api-rate-limits/)
- Crossref Retraction Watch: integrated into the REST API and published as a daily CSV, with record-level revisions as recent as 2026-03-26 — [Crossref RW documentation](https://www.crossref.org/documentation/retrieve-metadata/retraction-watch/); [Crossref community thread](https://community.crossref.org/t/api-retraction-status-not-confirmed-at-retractiondatabase-org/15831)
- Crossref list query `filter=update-type:retraction` reports `total-results: 76410` notices (live probe 2026-10-23) — [Crossref works API](https://api.crossref.org/works?filter=update-type:retraction&rows=1)
- DOAJ: API v4.0.1 went live on 21 Aug 2025 — [DOAJ API docs](https://doaj.org/api/docs)
- ROR: v2 API live, with records at `schema_version 2.1` modified as recently as June 2026 (live probe 2026-10-23) — [ROR API](https://api.ror.org/v2/organizations?query=stanford); client-ID policy proposed in Aug 2024 — [ROR blog](https://ror.org/blog/2024-08-29-api-client-identification/)
- scite: acquired by Research Solutions in Nov 2023, then about 21,000 B2C subscribers and $3.6M ARR — [Research Solutions press release](https://researchsolutions.investorroom.com/2023-11-27-Research-Solutions-Announces-Acquisition-of-scite)
- OpenCitations: Index v2 live, with more than 2.2B citations as of July 2025 — [OpenAIRE guide](https://www.openaire.eu/opencitations-guide); [OpenCitations Index API v2](https://api.opencitations.net/index/v2)
- Sherpa Romeo: rebranded Jisc "Open Policy Finder" (per secondary source), with v1 retired in 2020 — [Lantern/secondary](https://lantern.cottagelabs.com/sources); [Lyrasis](https://lyrasisnow.org/?p=4741)
- Live HTTP 200 responses (2026-10-23) from ORCID, ROR, DataCite, OpenCitations, iCite, DOAJ, scite tallies and Crossref confirm these APIs were operational — see per-API links above

### Inferences
- If Peerly code or plans assume keyless Altmetric calls, they are broken as of Nov 2025.
- Peerly's browser fetches to Crossref without `mailto` sit in the public pool at 5/s for single records and 1/s for lists, shared per user IP. That is fine for individual users but tight for any server-side batch job, so batch jobs should use `mailto` (polite pool) or a Crossref Metadata Plus subscription (paid).

### Gaps
- No source on Altmetric pricing or tier changes in 2026 was found, beyond the Nov 2025 key requirement.
- No source on scite API pricing or policy changes after the acquisition was found.
- No official source was found confirming the Sherpa Romeo to "Open Policy Finder" rename date or a licence change.
- No source confirmed whether ORCID introduced Public API fees by 2026. The terms only allow for it with notice.
