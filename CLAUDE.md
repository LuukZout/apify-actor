# Kompas.nl Dutch Company Enrichment Scraper — Apify Actor

## Project purpose

This is an Apify Actor that scrapes enriched Dutch company data from Kompas.nl. It fills the gap between the anonymised KVK open dataset and what B2B sales teams actually need: company name, address, employee count, revenue band, SIC/activity code, and contact details — structured and exportable.

The output is a clean JSON/CSV dataset that can be piped into a CRM, data warehouse, or used directly in Apify scheduled runs.

Target buyers: Dutch B2B sales teams, RevOps, lead enrichment pipelines, market research analysts.

---

## Tech stack

- **Runtime:** Node.js (TypeScript)
- **Framework:** Apify SDK v3 (`crawlee` + `apify`)
- **Crawler:** `PlaywrightCrawler` (Kompas uses JS rendering — Cheerio will not work)
- **Language:** TypeScript strict mode
- **Output:** Apify Dataset (JSON, CSV, XLSX exportable via Apify Console)
- **Proxy:** Apify residential proxy pool — Netherlands exit nodes preferred

---

## Project structure

```
kompas-scraper/
├── CLAUDE.md                  ← this file
├── README.md                  ← Apify actor description (shown in Store)
├── actor.json                 ← Apify actor manifest
├── .actor/
│   └── input_schema.json      ← defines the actor's input form in Apify Console
├── src/
│   ├── main.ts                ← actor entrypoint, router setup
│   ├── routes/
│   │   ├── search.ts          ← handles search result pages (pagination)
│   │   └── detail.ts          ← handles individual company detail pages
│   ├── extractors/
│   │   └── company.ts         ← DOM extraction logic for company fields
│   ├── utils/
│   │   ├── proxy.ts           ← proxy session configuration
│   │   └── validators.ts      ← input validation helpers
│   └── types.ts               ← shared TypeScript interfaces
├── tests/
│   ├── extractor.test.ts      ← unit tests for extraction logic
│   └── fixtures/              ← saved HTML snapshots for offline testing
├── package.json
├── tsconfig.json
└── .env.example               ← APIFY_TOKEN placeholder, never commit real keys
```

---

## Commands

```bash
# Install dependencies
npm install

# Run locally in development (uses Apify CLI)
apify run

# Run with custom input
apify run --input='{"searchQuery":"bouw","maxItems":50}'

# Run tests
npm test

# Build TypeScript
npm run build

# Lint
npm run lint

# Push to Apify (deploys the actor)
apify push
```

---

## Actor input schema

Defined in `.actor/input_schema.json`. Fields:

| Field                   | Type    | Required | Description                                                          |
| ----------------------- | ------- | -------- | -------------------------------------------------------------------- |
| `searchQuery`           | string  | yes      | Company name, SIC keyword, or city                                   |
| `maxItems`              | integer | no       | Max results to return (default: 100, max: 10 000)                    |
| `location`              | string  | no       | City or province filter (e.g. `Rotterdam`, `Noord-Holland`)          |
| `sectorCode`            | string  | no       | Kompas sector/SIC filter code                                        |
| `includeContactDetails` | boolean | no       | Whether to scrape phone/email from detail pages (slower, costs more) |
| `proxyConfiguration`    | object  | no       | Apify proxy config (auto-populated in Apify Console)                 |

---

## Output schema

Each item pushed to the Apify Dataset must match this shape exactly:

```typescript
interface CompanyRecord {
  // Identity
  kompasId: string; // Kompas internal ID from URL slug
  kvkNumber: string | null; // KVK number if displayed on page
  companyName: string;
  legalForm: string | null; // BV, NV, VOF, eenmanszaak, etc.

  // Location
  streetAddress: string | null;
  postalCode: string | null;
  city: string | null;
  province: string | null;

  // Classification
  sectorCode: string | null;
  sectorName: string | null;
  activityDescription: string | null;

  // Size signals
  employeeBand: string | null; // e.g. "10-49", "50-99"
  revenueBand: string | null; // e.g. "€1M-€5M"

  // Contact (only if includeContactDetails = true)
  phone: string | null;
  website: string | null;
  email: string | null;

  // Meta
  sourceUrl: string;
  scrapedAt: string; // ISO 8601
}
```

Do not add extra fields. Do not rename fields. Buyers rely on this schema being stable.

---

## Crawl strategy

### Phase 1 — Search & pagination

Start URL pattern:

```
https://www.kompas.nl/bedrijven?q={searchQuery}&plaats={location}&page={n}
```

1. Extract all company card links from search results
2. Enqueue each `/bedrijf/{slug}` URL into the request queue with label `DETAIL`
3. Detect next page link; if present and `itemCount < maxItems`, enqueue next search page with label `SEARCH`

### Phase 2 — Detail page extraction

For each detail URL:

1. Extract all fields listed in the output schema
2. If `includeContactDetails = true`, also look for phone/email/website
3. Push the record to the dataset

### Anti-bot considerations

- Use `PlaywrightCrawler` with `launchContext: { useChrome: true }` to match a real browser fingerprint
- Route through Apify residential proxies with NL exit nodes — Kompas may block datacenter IPs
- Add randomised `navigationTimeoutSecs` between 15–30 to avoid uniform timing
- Respect `minConcurrency: 1, maxConcurrency: 3` — do not hammer the site
- Do NOT bypass any login walls. Only scrape publicly accessible pages (no account required on Kompas.nl free tier)

---

## Code style

- TypeScript strict mode — no `any`, no `@ts-ignore`
- Named exports only — no default exports
- All async functions must have explicit return types
- Extraction logic lives in `src/extractors/` — keep route handlers thin
- Use `log.info()` / `log.warning()` / `log.error()` from the Apify SDK — never `console.log`
- Null is the canonical missing-value sentinel — never use empty string `""` for missing data

---

## Testing approach

- Unit test all extraction logic in `src/extractors/company.ts` against HTML fixtures
- Fixtures are saved real HTML pages stored in `tests/fixtures/` — checked into git
- To capture a new fixture: `apify run --save-snapshots` and copy the saved HTML
- Run `npm test` before every `apify push`
- No integration tests against live Kompas.nl in CI — tests must run offline

---

## Apify-specific conventions

- Use `Actor.main()` as the entrypoint — never call `process.exit()`
- Push records with `await Actor.pushData(record)` — never batch manually
- Use `Actor.getInput()` to read input — never read from environment variables directly
- Log run statistics at the end: items scraped, pages visited, errors
- Store intermediate state in `Actor.getValue/setValue` if resuming long runs

---

## Key files to read first

When starting a new session, read these in order:

1. `src/types.ts` — understand the data model
2. `src/main.ts` — understand the router and crawl entry point
3. `src/routes/search.ts` → `src/routes/detail.ts` — understand the crawl flow
4. `.actor/input_schema.json` — understand what users can configure

---

## Warnings

- **Never commit `.env` or any file containing `APIFY_TOKEN`**
- **Never scrape pages that require a Kompas account/login** — the free public search is sufficient and legally safer
- **Never change the output field names** once the actor is published — it breaks existing integrations
- Kompas.nl may restructure their DOM without notice. If extraction returns mostly nulls, check selectors in `src/extractors/company.ts` first

---

## Publishing checklist (before `apify push`)

- [ ] `npm test` passes with no failures
- [ ] `npm run lint` passes with no errors
- [ ] `README.md` is up to date with current input/output schema
- [ ] `actor.json` version is bumped
- [ ] Tested locally with `apify run` against a small query (e.g. `maxItems: 10`)
- [ ] Output records match the `CompanyRecord` interface exactly
- [ ] No hardcoded selectors that depend on Kompas session state or logged-in markup
