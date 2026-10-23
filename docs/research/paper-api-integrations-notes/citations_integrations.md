# Citation Formatting, Import/Export, Reference-Manager and Notification APIs for Peerly (as of Oct 2026)

Method note: findings come from primary docs fetched on 2026-10-23, plus a live `curl` test run that day from a server against doi.org, api.crossref.org and api.zotero.org with `Origin: https://peerly.io`. These are marked "[live test 2026-10-23]". Pages that are old or out of date are flagged inline.

## Citation formatting: DOI content negotiation, Crossref/DataCite formatter, citation-js, CSL; CORS

### Takeaway
DOI content negotiation at `https://doi.org/{doi}` can return BibTeX, RIS, CSL-JSON and formatted citations (`text/x-bibliography; style=apa`) for Crossref, DataCite and mEDRA DOIs. The live test showed doi.org and the Crossref endpoint it redirects to both return CORS headers, so browser calls should work for Crossref DOIs. For a whole library export, or for formatting papers without DOIs, use citation-js (MIT) on the client side with CSL-JSON, so you don't send one network call per paper.

### Cited Findings
- **Supported media types** (Accept header to `https://doi.org/<DOI>`): BibTeX `application/x-bibtex` (Crossref, DataCite, mEDRA); RIS `application/x-research-info-systems` (Crossref and DataCite, not mEDRA); CSL-JSON `application/vnd.citationstyles.csl+json` (all three); formatted `text/x-bibliography` with optional `style` (a CSL style repository name such as `apa` or `harvard3`) and `locale` (such as `fr-FR`) parameters. Other formats are RDF/XML, Turtle, Schema.org JSON-LD, Crossref Unixref/UNIXSD and DataCite XML. — [DOI Citation Formatter docs (citation.doi.org)](https://citation.doi.org/docs.html)
- **Response codes:** 200 OK, 204 no metadata, 404 DOI not found, 406 no acceptable content type. The docs were last updated on Nov 7, 2024. They do not document CORS or rate limits. — [citation.doi.org/docs](https://citation.doi.org/docs.html)
- **Flag, outdated URL:** `citation.crosscite.org/docs.html` now returns a 301 redirect to `citation.doi.org/docs.html`, so links and bookmarks should be updated. — [citation.crosscite.org (redirect observed)](https://citation.crosscite.org/docs.html)
- For non-HTML requests, doi.org redirects to the metadata service of the DOI's registration agency (for example Crossref's). — [DataCite DOI Content Negotiation](https://support.datacite.org/docs/doi-content-negotiation)
- **[live test 2026-10-23] Redirect target:** `GET https://doi.org/10.1038/nature12373` with `Accept: application/x-bibtex` or `text/x-bibliography; style=apa` returns a 302 to `https://api.crossref.org/v1/works/10.1038%2Fnature12373/transform`.
- **[live test] CORS on doi.org:** the 302 includes `access-control-allow-origin: https://peerly.io`, which echoes the origin. An OPTIONS preflight to doi.org returns 200 with `access-control-allow-methods: GET,POST,HEAD`, `access-control-allow-headers: X-Requested-With,Content-Type,Accept,Origin` and `access-control-max-age: 1800`.
- **[live test] CORS on api.crossref.org:** returns `access-control-allow-origin: *` and allows the `Accept` header. It also returned `x-rate-limit-limit: 5` and `x-rate-limit-interval: 1s`, meaning 5 requests per second for the anonymous pool.
- **[live test] APA output:** `text/x-bibliography; style=apa` returned a fully formatted APA string ("Kucsko, G., Maurer, P. C., … (2013). Nanometre-scale thermometry in a living cell. Nature, 500(7460), 54–58. https://doi.org/10.1038/nature12373").
- **Why redirect-plus-preflight has failed in the past:** a 2016 W3C thread said browsers would not follow 30x redirects on preflighted requests. Modern Fetch spec behavior has relaxed this, but it is the historical reason content negotiation broke in browsers. — [W3C public-webappsec 2016](https://lists.w3.org/Archives/Public/public-webappsec/2016Jun/0053.html)
- **Crossref direct transform endpoint:** `https://api.crossref.org/works/{doi}/transform/{mime}` (also `/v1/works/{doi}/transform` with an Accept header) is what doi.org redirects to. [live test]
- **citation-js:** MIT licensed and modular. `@citation-js/core` holds the `Cite` class and plugin manager. Plugins are `plugin-bibtex`, `plugin-ris`, `plugin-csl` (CSL output) and `plugin-doi` (DOI input). Inputs include BibTeX, Wikidata JSON and BibJSON, all normalized to CSL-JSON. Outputs include APA, Vancouver, RIS and BibTeX. It is built for both the browser and the CLI. — [citation-js GitHub](https://github.com/citation-js/citation-js)
- citation-js uses `plugins.config.get(ref)` for plugin config. "Dict" plugins extend CSL with extra locales and templates. The API docs navigation points to `/api/0.8`, and the docs were generated Mar 5, 2024. — [citation.js.org plugins tutorial](https://citation.js.org/api/0.7/tutorial-plugins.html)

### Inferences
- **Recommended architecture:** Peerly already stores Crossref/OpenAlex metadata, so it should map stored rows to CSL-JSON and render citations client-side with `@citation-js/core` plus `plugin-csl` and `plugin-bibtex`/`plugin-ris`. This gives zero network calls, works for non-DOI papers such as arXiv or PubMed-only items, and avoids Crossref's 5 req/s anonymous limit during bulk library export.
- doi.org content negotiation is a good option for a "Cite this paper" button that covers any of the roughly 10,000 CSL styles on demand. Because CORS is open, it can be called from the browser for one paper at a time. Route it through a Supabase edge function with caching if Peerly wants to add a `mailto` (Crossref polite pool) or protect against rate limits.
- For custom styles in citation-js, fetch the `.csl` XML from the CSL styles repository and register it with `plugins.config.get('@csl').templates.add(name, xml)`. The exact call was not confirmed on the fetched page (see Gaps).
- DataCite and mEDRA DOIs redirect to their own agencies' services, whose CORS headers were not tested. Have a server fallback ready.

### Gaps
- The current citation-js npm version and release date, and the exact list of bundled CSL templates (apa, vancouver and harvard1 are believed to be default but this is not verified), could not be confirmed.
- No official rate limit is published for doi.org content negotiation itself. The only measured limit is Crossref's 5/s anonymous header. Crossref's polite and paid pool limits for 2026 were not fetched.
- DataCite's and mEDRA's CORS behavior after redirect was not tested.

## Reference managers: Zotero Web API, Mendeley (2026 status), Paperpile, EndNote; BibTeX/RIS import

### Takeaway
Zotero is the only major reference manager with a well-documented, open, CORS-enabled read/write web API. Its auth is OAuth 1.0a (no OAuth 2) or a user-pasted API key. Mendeley's API still exists but is stagnant, and no 2026 shutdown notice was found. Paperpile and EndNote have no public web APIs, so support them through BibTeX/RIS file import and export.

### Cited Findings
- **Zotero base URL and auth:** base `https://api.zotero.org` (HTTPS only). Send `Zotero-API-Version: 3`. Public libraries need no auth. Private libraries need an API key sent as a `Zotero-API-Key` header, `Authorization: Bearer`, or a `key` query parameter (not recommended). — [Zotero Web API v3 basics](https://www.zotero.org/support/dev/web_api/v3/basics)
- **Zotero pagination and export formats:** `limit` is 1–100 (default 25), with `Total-Results` and `Link` headers for paging. `format=` accepts `json`, `atom`, `bib`, `keys`, `versions`, and export formats including `bibtex`, `biblatex`, `ris`, `csljson`, `csv`, `mods` and `tei`. `format=bib` is capped at 150 items. `include=bib,citation` with `style=` (Zotero style repo name or CSL URL, default `chicago-note-bibliography`) and `locale=` returns server-formatted citations. — [Zotero basics](https://www.zotero.org/support/dev/web_api/v3/basics)
- **Zotero rate limits:** a `Backoff: <seconds>` header can appear on any response. A 429 comes with `Retry-After` (use exponential backoff if it is missing). Keep concurrency at about 4 or fewer. Batched writes are recommended. — [Zotero basics](https://www.zotero.org/support/dev/web_api/v3/basics)
- **Zotero OAuth 1.0a:** endpoints are `https://www.zotero.org/oauth/request`, `/oauth/authorize` and `/oauth/access`. Permission query parameters are `library_access`, `notes_access`, `write_access` (each 1/0) and `all_groups=none|read|write`. `identity=1` returns only the identity. The access response returns `oauth_token`, `oauth_token_secret` and `userID`, and the token secret is the API key. Keys stay valid until the user revokes them. OAuth 2 is not mentioned. — [Zotero OAuth](https://www.zotero.org/support/dev/web_api/v3/oauth)
- **[live test 2026-10-23] Zotero CORS:** `api.zotero.org` returns `access-control-allow-origin: *` and allows HEAD/GET/POST/PUT/PATCH/DELETE. It allows the headers `Authorization`, `Zotero-API-Key`, `Zotero-API-Version`, `Zotero-Write-Token`, `If-Unmodified-Since-Version` and others, and exposes `Backoff`, `Retry-After`, `Total-Results`, `Last-Modified-Version` and `Link`.
- **Mendeley:** the developer portal's main notice is still the early-2021 changes (removal of Profile Search, Follower endpoints, public Groups attributes and public profile fields). No newer status was posted. — [Mendeley developer portal](https://dev.mendeley.com/); the endpoint removal list (410 responses) was last updated Feb 18, 2021 — [Elsevier: Mendeley API Changes](https://www.elsevier.support/mendeley/answer/mendeley-api-changes)
- **Mendeley in 2026:** no official 2026 API deprecation was found. Related 2026 changes: institutional Mendeley accounts drop from 100 GB to the free 2 GB from Jan 2026 — [CSU library blog](https://library-blog.csu.edu.au/?p=14541). Some institutions are moving users from Mendeley Desktop and Mendeley for Word to Mendeley Web and Cite as of Sept 1, 2026 — [Univ. of Groningen](https://www.rug.nl/medicallibrary/news/2026-09-mendeley?lang=en). Elsevier reversed its plan to stop Mendeley Desktop in July 2025 and kept essential support — [Wikipedia: Mendeley](https://en.wikipedia.org/wiki/Mendeley)
- **EndNote:** an EndNote team member said on its forum that EndNote Web "does not have an API as such". Developers asking how to push metadata were pointed to the desktop-oriented API. — [EndNote community](https://community.endnote.com/t/endnotes-web-api/387005)
- **Paperpile:** no public developer API was found. Comparison listings mention only import and export features. — [Capterra Paperpile vs EndNote](https://www.capterra.fr/compare/1015644/1017351/paperpile/vs/endnote)
- **BibTeX/RIS import:** the Zotero translation-server `/import` endpoint turns raw BibTeX, RIS and similar data into Zotero JSON, and `/export?format=` turns it back. — [zotero/translation-server](https://github.com/zotero/translation-server). citation-js also parses BibTeX and RIS (via its plugins) into CSL-JSON in the browser. — [citation-js](https://github.com/citation-js/citation-js)

### Inferences
- **Zotero integration path:**
  - **Phase 1:** "Paste your Zotero API key + userID" for one-way import, read-only, done in the browser because CORS is open.
  - **Phase 2:** OAuth 1.0a in a Supabase edge function. OAuth 1.0a needs HMAC-SHA1 request signing with a consumer secret, so it must run server-side. Store the returned key encrypted, enable two-way sync using `Last-Modified-Version` and `If-Unmodified-Since-Version`, and push Peerly shelves to Zotero collections with `write_access=1`.
- Peerly items can be stored as Zotero JSON or CSL-JSON, so Zotero's `format=csljson` drops straight into the citation-js pipeline.
- Mendeley integration is low priority because of its stagnant API and Elsevier's track record of retiring features. Offer RIS/BibTeX import instead, since Mendeley, Paperpile and EndNote can all export these formats.
- The simplest universal option is a client-side parse of uploaded `.bib`/`.ris` files with citation-js, followed by DOI matching against Crossref/OpenAlex to dedupe against Peerly's catalog.

### Gaps
- Mendeley's current rate limits, OAuth 2 endpoint details and API terms were not on the fetched portal page, which looks unmaintained.
- Paperpile's help docs were not checked directly. A private or partner API could exist.
- The Zotero write API page (`/write_requests`) was not fetched. Its batch limit (believed to be 50 objects per write) is unverified.

## Identifier and metadata tools: Zotero translation-server, Crossref/CORE "metadata from URL/PDF", GROBID

### Takeaway
Self-host Zotero translation-server (Docker, port 1969) to turn any URL or identifier into structured metadata. It is what powers Zotero's browser connector and Wikipedia's Citoid. Use GROBID for PDF uploads. Both need a server, not the browser, and neither fits inside a Supabase edge function, so they need a small container host.

### Cited Findings
- **translation-server endpoints:**
  - `POST /web` takes a URL as a `text/plain` body and returns Zotero JSON. It returns `300 Multiple Choices` with options for multi-item pages, and you POST the selection back.
  - `POST /search` takes a DOI, ISBN, PMID or arXiv ID.
  - `POST /export?format=` converts Zotero JSON to BibTeX, RIS and similar.
  - `POST /import` converts raw BibTeX or RIS to Zotero JSON.
  — [zotero/translation-server](https://github.com/zotero/translation-server)
- **translation-server deployment:** run with `docker run -d -p 1969:1969 --rm --name translation-server zotero/translation-server`. Deployed services should set a custom `USER_AGENT` with contact info, and appending to a standard browser UA helps avoid blocks. It supports `HTTP_PROXY`/`HTTPS_PROXY`. Neither CORS nor auth is documented, so put it behind your own proxy. — [translation-server README](https://github.com/zotero/translation-server)
- **GROBID endpoints** (default port 8070):
  - `/api/processHeaderDocument` returns PDF header metadata as TEI XML, or BibTeX with `Accept: application/x-bibtex`.
  - `/api/processFulltextDocument` returns the full document.
  - `/api/processReferences` returns parsed references.
  - `/api/processCitation` and `/api/processCitationList` parse raw reference strings.
  - The `concurrency` setting defaults to 10. `poolMaxWait` defaults to 1 s, after which the server returns 503. Docker is the recommended deployment. Docs examples reference v0.9.1.
  — [GROBID service docs](https://grobid.readthedocs.io/en/latest/Grobid-service/)

### Inferences
- **Typical flow:** user pastes a URL, an edge function calls translation-server `/web`, and the returned DOI is used to enrich from Crossref/OpenAlex as Peerly already does. For PDFs: upload to Supabase Storage, call GROBID `processHeaderDocument` with consolidation enabled so GROBID matches against Crossref, take the DOI, then enrich.
- For identifier-only input (DOI, PMID, arXiv), Peerly's existing Crossref, PubMed and OpenAlex calls are enough. translation-server earns its place for arbitrary publisher or preprint URLs.
- Hosting is the cost: translation-server is a light Node container, while GROBID is a heavy Java container that needs several GB of RAM. Fly.io, Railway or Render are options, which is an inference and was not priced here. Defer GROBID until PDF upload is a real user request.

### Gaps
- GROBID's licence (believed to be Apache-2.0), its Docker image variants (lightweight CRF versus full deep-learning image) and RAM/CPU requirements were not on the fetched page.
- translation-server's licence (believed to be AGPL-3.0, which matters if modified and exposed as a network service) was not confirmed from the README text.
- No current public hosted "metadata from URL/PDF" API from Crossref or CORE was researched. Crossref offers only reference matching via `query.bibliographic` (not fetched), and CORE's API was not fetched in this pass.

## Notifications and engagement: Resend, Postmark, SendGrid; Slack/Discord webhooks

### Takeaway
Resend has the best free tier for a Supabase-based startup: 3,000 emails/month, capped at 100/day, then $20/month for 50k. It is also Supabase's commonly paired SMTP and edge-function provider. Postmark's free tier is only 100 emails/month, with paid plans from $15/month for 10k, but it has excellent deliverability and separate broadcast streams. **SendGrid no longer has a free plan.** It was retired in May 2025 and replaced by a one-time 60-day trial.

### Cited Findings
- **Resend free tier:** 3,000 transactional emails/month, capped at 100/day, 3 domains. The free marketing tier allows 1,000 contacts. — [Resend pricing](https://resend.com/pricing)
- **Resend paid tiers:** Pro is $20/month for 50k emails or $35 for 100k, with $0.90 per 1k overage, 10 domains and no daily cap. Scale runs from $90 for 100k up to $1,150 for 2.5M. Marketing plans are priced by contacts, from $40/month for 5k contacts, and broadcasts do not count against transactional quota. The API rate limit is per team and the same on all plans, and the Batch API sends up to 100 emails per request, counted as one request. — [Resend pricing](https://resend.com/pricing)
- **Postmark free tier:** the Developer plan is $0 for 100 emails/month, with no overages and no expiry. — [Postmark pricing](https://postmarkapp.com/pricing)
- **Postmark paid tiers:** Basic is $15/month, Pro $16.50 and Platform $18, each for 10k emails, with overages of $1.80, $1.30 and $1.20 per 1k respectively. Separate broadcast (marketing) message streams are required, because transactional and marketing email must not be mixed. Dedicated IP costs $50/month and needs 300k+ emails/month. — [Postmark pricing](https://postmarkapp.com/pricing)
- **SendGrid:** Twilio retired the Free Email API and Free Marketing Campaigns plans starting May 27, 2025. Free accounts kept sending for 60 days, then sending was paused. — [Twilio changelog](https://www.twilio.com/en-us/changelog/sendgrid-free-plan); [Twilio changelog (May 28)](https://www.twilio.com/en-us/changelog/changes-coming-to-sendgrid-s-free-plans). New signups get a one-time 60-day trial at 100 emails/day. — [Twilio docs: upgrade plan](https://www.twilio.com/docs/sendgrid/ui/account-and-settings/upgrading-your-plan.md). Paid plans are reported to start at $19.95/month for Essentials, but this comes from a secondary source. — [dreamlit.ai](https://dreamlit.ai/blog/best-sendgrid-alternatives)
- **Flag:** any older guide that recommends "SendGrid's free 100/day forever" is outdated as of 2025–2026.

### Inferences
- **Recommended stack:**
  - Use Resend from a Supabase edge function (`fetch('https://api.resend.com/emails')` with a Bearer key).
  - Trigger new-review notifications from a Postgres trigger, `pg_net`, or a Database Webhook that calls the edge function.
  - Run the weekly digest with `pg_cron` calling the edge function every Monday, using the Batch API at 100 emails per call.
  - At 100/day, the free tier supports a digest list of about 100 users per day. Past that, Pro at $20/month removes the cap.
- **Compliance:** keep digests in a separate stream or category. Resend Broadcasts or Postmark broadcast streams make this possible, and Peerly needs one-click unsubscribe (Gmail and Yahoo bulk-sender rules). Clerk handles auth email, so it does not consume this quota.
- **Slack/Discord webhooks:** both are free and need no OAuth for incoming webhooks. A user or lab pastes a webhook URL and Peerly POSTs JSON from an edge function, for example `{content}` for Discord or `{text}` or blocks for Slack. This is useful for "lab reading group" channels. Webhook URLs must stay server-side because they are secrets.

### Gaps
- Slack and Discord webhook rate limits were not verified this session. They are commonly cited as about 1 message/second for Slack incoming webhooks and about 30 per minute per Discord webhook, both unconfirmed and from memory. Slack's 2025 API terms changes for non-Marketplace apps were not checked, though they mostly affect `conversations.history` rather than incoming webhooks.
- Resend's exact default API rate limit (historically 2 requests/second) was not stated on the pricing page.
- SendGrid's current official price list was not fetched from Twilio directly.
- Brevo, Mailgun, Amazon SES and Loops were not evaluated. SES is the cheapest at volume but needs more setup.
