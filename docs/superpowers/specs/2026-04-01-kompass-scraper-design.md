# Kompass Dutch Company Enrichment Scraper — Design Spec

**Date:** 2026-04-01
**Status:** Approved

---

## Overview

Build a complete Apify Actor that scrapes enriched Dutch company data from nl.kompass.com. The actor replaces the existing Python/BeautifulSoup boilerplate with a TypeScript implementation using PlaywrightCrawler.

**Target users:** Dutch B2B sales teams, RevOps, lead enrichment pipelines, market research analysts.

---

## Decisions Made

| Question | Decision |
|---|---|
| Language | TypeScript (Apify SDK v3, Crawlee) |
| Crawler | PlaywrightCrawler (JS rendering required) |
| Scope | Full build — both phases + `includeContactDetails` |
| Selectors | Placeholder stubs with `// TODO: verify selector` comments; updated after live test run |
| Tests | Vitest + placeholder HTML fixtures; `npm test` passes immediately |
| Structure | Layered (main → router → routes → extractors) |

---

## File Structure

```
apify-actor/
├── CLAUDE.md
├── README.md
├── actor.json                     ← updated: kompass-scraper, v0.1
├── .actor/
│   └── input_schema.json          ← Kompass input fields
├── src/
│   ├── main.ts                    ← Actor.main(), crawler init, router wiring
│   ├── types.ts                   ← CompanyRecord + ActorInput interfaces
│   ├── routes/
│   │   ├── search.ts              ← paginate results, enqueue DETAIL URLs
│   │   └── detail.ts              ← extract one company, push to dataset
│   ├── extractors/
│   │   └── company.ts             ← all DOM selectors + extraction logic
│   └── utils/
│       ├── proxy.ts               ← proxy session config helper
│       └── validators.ts          ← validate/normalise ActorInput
├── tests/
│   ├── extractor.test.ts          ← unit tests against HTML fixtures
│   └── fixtures/
│       ├── search-page.html       ← placeholder stub (2-3 fake cards)
│       └── detail-page.html       ← placeholder stub (all field branches)
├── package.json
├── tsconfig.json
└── .env.example
```

Files deleted: `src/main.py`, `requirements.txt`.

---

## Data Model

### `ActorInput` (src/types.ts)

```typescript
interface ActorInput {
  searchQuery: string;
  maxItems: number;           // default 100, max 10000
  location?: string;
  sectorCode?: string;
  includeContactDetails: boolean;
  proxyConfiguration?: ProxyConfigurationOptions;
}
```

### `CompanyRecord` (src/types.ts)

```typescript
interface CompanyRecord {
  // Identity
  kompassId: string;
  kvkNumber: string | null;
  companyName: string;
  legalForm: string | null;
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
  employeeBand: string | null;
  revenueBand: string | null;
  // Contact (only when includeContactDetails = true)
  phone: string | null;
  website: string | null;
  email: string | null;
  // Meta
  sourceUrl: string;
  scrapedAt: string; // ISO 8601
}
```

Schema is frozen — no renames, no additions after publish.

---

## Crawl Strategy

### Search URL pattern
```
https://nl.kompass.com/r/nl/nl/?text={searchQuery}&localization={location}&page={n}
```

### `itemCount` tracking
A persistent counter is stored via `Actor.getValue('itemCount')` / `Actor.setValue('itemCount', n)`. Initialised to `0` on first run; incremented each time a `DETAIL` URL is enqueued. This allows the actor to resume correctly on restart.

### Phase 1 — Search & Pagination (`routes/search.ts`)
1. Extract all company card links matching `/c/{name}/{id}/`
2. Read current `itemCount`; enqueue each as `DETAIL` and increment counter — stop enqueuing when `itemCount >= maxItems`
3. Find "next page" link; if present and under limit, enqueue next `SEARCH` page

### Phase 2 — Detail Extraction (`routes/detail.ts`)
1. Call `extractCompany(page, sourceUrl, includeContactDetails)`
2. `await Actor.pushData(record)`

### Extractor (`extractors/company.ts`)
- Pure function, takes `Page + sourceUrl + includeContactDetails`, returns `CompanyRecord`
- All selectors defined as named constants at top of file
- Returns `null` for any field not found — never `""`
- `kompassId` parsed from URL slug
- Phone/email/website only extracted when `includeContactDetails = true`
- Placeholder selectors marked `// TODO: verify selector after live capture`

---

## Anti-Bot Configuration

| Setting | Value |
|---|---|
| `launchContext.useChrome` | `true` |
| `minConcurrency` | `1` |
| `maxConcurrency` | `3` |
| `navigationTimeoutSecs` | Random 15–30s per request |
| Proxy | Apify residential, NL exit nodes preferred |

---

## Input Schema (`.actor/input_schema.json`)

| Field | Type | Required | Default |
|---|---|---|---|
| `searchQuery` | string | yes | — |
| `maxItems` | integer | no | 100 |
| `location` | string | no | — |
| `sectorCode` | string | no | — |
| `includeContactDetails` | boolean | no | false |
| `proxyConfiguration` | object | no | — |

---

## Testing

**Framework:** Vitest

**`tests/extractor.test.ts`:**
- Loads `tests/fixtures/detail-page.html` as a string
- Uses a real Playwright browser (`beforeAll`) with `page.setContent(fixtureHtml)` — no mocking of the Page API needed
- Asserts all `CompanyRecord` fields are present with correct types
- Asserts missing fields return `null`, not `""`
- Asserts `kompassId` is correctly parsed from a URL slug
- Loads `tests/fixtures/search-page.html` and asserts company card links are detected

**Placeholder fixtures:**
- `search-page.html`: minimal HTML with 2–3 fake `/c/{name}/{id}/` card links
- `detail-page.html`: minimal HTML covering every extractor branch
- Both marked with `// TODO: replace with real captured HTML after live run`

**Requirement:** `npm test` passes immediately with placeholder fixtures.

---

## `package.json` Scripts

```json
{
  "build": "tsc",
  "start": "node dist/main.js",
  "test": "vitest run",
  "lint": "eslint src --ext .ts"
}
```

Dependencies: `apify`, `crawlee`, `playwright`, `typescript`, `vitest`, `@types/node`, `eslint`, `@typescript-eslint/eslint-plugin`.

---

## Warnings / Constraints

- Never commit `.env` or any file containing `APIFY_TOKEN`
- Never scrape login-walled pages
- Never change `CompanyRecord` field names after publish
- If extraction returns mostly nulls: check selectors in `src/extractors/company.ts`
- Run `npm test` and `npm run lint` before every `apify push`
