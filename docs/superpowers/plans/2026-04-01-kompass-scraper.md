# Kompass Dutch Company Enrichment Scraper — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete Apify Actor that scrapes enriched Dutch company data from nl.kompass.com using PlaywrightCrawler, outputting structured `CompanyRecord` JSON to an Apify Dataset.

**Architecture:** Layered — `main.ts` wires a `PlaywrightCrawler` router to two route handlers (`routes/search.ts`, `routes/detail.ts`); all DOM logic lives in `extractors/company.ts`; routes stay thin. Placeholder CSS selectors are used throughout and marked TODO for replacement after a live test run.

**Tech Stack:** TypeScript (strict), Apify SDK v3, Crawlee v3, PlaywrightCrawler, Vitest, Playwright (chromium for tests).

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| Delete | `src/main.py` | Replace Python boilerplate |
| Delete | `requirements.txt` | Replace Python boilerplate |
| Create | `package.json` | Node deps + scripts |
| Create | `tsconfig.json` | TypeScript strict config |
| Create | `vitest.config.ts` | Vitest test runner config |
| Create | `.eslintrc.json` | ESLint + TypeScript rules |
| Create | `.env.example` | APIFY_TOKEN placeholder |
| Create | `src/types.ts` | `CompanyRecord` + `ActorInput` interfaces |
| Modify | `.actor/input_schema.json` | Kompass input fields |
| Modify | `.actor/actor.json` | Name, title, description |
| Create | `src/utils/validators.ts` | Validate + normalise `ActorInput` |
| Create | `tests/validators.test.ts` | Tests for validators |
| Create | `src/utils/proxy.ts` | Proxy session config helper |
| Create | `tests/fixtures/detail-page.html` | Placeholder company detail HTML |
| Create | `tests/fixtures/search-page.html` | Placeholder search results HTML |
| Create | `src/extractors/company.ts` | All DOM selectors + extraction logic |
| Create | `tests/extractor.test.ts` | Tests against HTML fixtures |
| Create | `src/routes/search.ts` | Paginate search results, enqueue DETAIL URLs |
| Create | `src/routes/detail.ts` | Extract one company, push to dataset |
| Create | `src/main.ts` | Actor entry point, crawler init |
| Modify | `README.md` | Kompass actor description |

---

## Task 1: Scaffold TypeScript Project

**Files:**
- Delete: `src/main.py`, `requirements.txt`
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.eslintrc.json`, `.env.example`

- [ ] **Step 1: Delete Python boilerplate**

```bash
rm src/main.py requirements.txt
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "kompass-dutch-company-scraper",
  "version": "0.1.0",
  "description": "Scrapes enriched Dutch company data from nl.kompass.com",
  "main": "dist/main.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/main.js",
    "test": "vitest run",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "apify": "^3.0.0",
    "crawlee": "^3.0.0",
    "playwright": "^1.40.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 4: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 30000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
```

- [ ] **Step 5: Create `.eslintrc.json`**

```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "no-console": "error"
  }
}
```

- [ ] **Step 6: Create `.env.example`**

```
APIFY_TOKEN=your_apify_token_here
```

- [ ] **Step 7: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` populated, no errors.

- [ ] **Step 8: Install Playwright Chromium browser**

```bash
npx playwright install chromium
```

Expected: Chromium downloaded to Playwright's cache directory.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts .eslintrc.json .env.example
git rm src/main.py requirements.txt
git commit -m "chore: scaffold TypeScript project, remove Python boilerplate"
```

---

## Task 2: Types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Create `src/types.ts`**

```typescript
import type { ProxyConfigurationOptions } from 'apify';

export interface ActorInput {
  searchQuery: string;
  maxItems: number;
  location?: string;
  sectorCode?: string;
  includeContactDetails: boolean;
  proxyConfiguration?: ProxyConfigurationOptions;
}

export interface CompanyRecord {
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

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add CompanyRecord and ActorInput TypeScript interfaces"
```

---

## Task 3: Input Schema and Actor Manifest

**Files:**
- Modify: `.actor/input_schema.json`
- Modify: `.actor/actor.json`

- [ ] **Step 1: Replace `.actor/input_schema.json`**

```json
{
  "title": "Kompass Dutch Company Scraper Input",
  "type": "object",
  "schemaVersion": 1,
  "properties": {
    "searchQuery": {
      "title": "Search query",
      "type": "string",
      "description": "Company name, SIC keyword, or city to search for.",
      "editor": "textfield"
    },
    "maxItems": {
      "title": "Max items",
      "type": "integer",
      "description": "Maximum number of company records to return.",
      "default": 100,
      "maximum": 10000,
      "minimum": 1,
      "editor": "number"
    },
    "location": {
      "title": "Location filter",
      "type": "string",
      "description": "City or province filter, e.g. 'Rotterdam' or 'Noord-Holland'.",
      "editor": "textfield"
    },
    "sectorCode": {
      "title": "Sector code",
      "type": "string",
      "description": "Kompass sector/SIC filter code.",
      "editor": "textfield"
    },
    "includeContactDetails": {
      "title": "Include contact details",
      "type": "boolean",
      "description": "Scrape phone, email, and website from detail pages. Slower and uses more compute.",
      "default": false,
      "editor": "checkbox"
    },
    "proxyConfiguration": {
      "title": "Proxy configuration",
      "type": "object",
      "description": "Apify proxy configuration. Auto-populated in Apify Console.",
      "editor": "proxy"
    }
  },
  "required": ["searchQuery"]
}
```

- [ ] **Step 2: Replace `.actor/actor.json`**

```json
{
  "actorSpecification": 1,
  "name": "kompass-dutch-company-scraper",
  "title": "Kompass Dutch Company Enrichment Scraper",
  "description": "Scrapes enriched Dutch company data from nl.kompass.com — name, address, employees, revenue, SIC code, and optional contact details.",
  "version": "0.1",
  "input": "./input_schema.json"
}
```

- [ ] **Step 3: Commit**

```bash
git add .actor/input_schema.json .actor/actor.json
git commit -m "feat: configure Kompass input schema and actor manifest"
```

---

## Task 4: Input Validator (TDD)

**Files:**
- Create: `tests/validators.test.ts`
- Create: `src/utils/validators.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/validators.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { validateInput } from '../src/utils/validators';

describe('validateInput', () => {
  it('accepts valid minimal input', () => {
    const result = validateInput({ searchQuery: 'bouw' });
    expect(result.searchQuery).toBe('bouw');
    expect(result.maxItems).toBe(100);
    expect(result.includeContactDetails).toBe(false);
    expect(result.location).toBeUndefined();
    expect(result.sectorCode).toBeUndefined();
  });

  it('throws when searchQuery is missing', () => {
    expect(() => validateInput({})).toThrow('searchQuery');
  });

  it('throws when searchQuery is not a string', () => {
    expect(() => validateInput({ searchQuery: 42 })).toThrow('searchQuery');
  });

  it('throws when maxItems is below 1', () => {
    expect(() => validateInput({ searchQuery: 'bouw', maxItems: 0 })).toThrow('maxItems');
  });

  it('throws when maxItems is above 10000', () => {
    expect(() => validateInput({ searchQuery: 'bouw', maxItems: 10001 })).toThrow('maxItems');
  });

  it('trims whitespace from searchQuery', () => {
    const result = validateInput({ searchQuery: '  bouw  ' });
    expect(result.searchQuery).toBe('bouw');
  });

  it('uses provided maxItems', () => {
    const result = validateInput({ searchQuery: 'bouw', maxItems: 500 });
    expect(result.maxItems).toBe(500);
  });

  it('sets includeContactDetails to true when provided', () => {
    const result = validateInput({ searchQuery: 'bouw', includeContactDetails: true });
    expect(result.includeContactDetails).toBe(true);
  });

  it('passes through location and sectorCode', () => {
    const result = validateInput({ searchQuery: 'bouw', location: 'Amsterdam', sectorCode: 'A01' });
    expect(result.location).toBe('Amsterdam');
    expect(result.sectorCode).toBe('A01');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- tests/validators.test.ts
```

Expected: FAIL — "Cannot find module '../src/utils/validators'"

- [ ] **Step 3: Create `src/utils/validators.ts`**

```typescript
import { ActorInput } from '../types';

export function validateInput(input: unknown): ActorInput {
  if (!input || typeof input !== 'object') {
    throw new Error('Input is required and must be an object');
  }
  const raw = input as Record<string, unknown>;

  if (!raw.searchQuery || typeof raw.searchQuery !== 'string') {
    throw new Error('searchQuery is required and must be a string');
  }

  const maxItems = raw.maxItems === undefined ? 100 : raw.maxItems;
  if (typeof maxItems !== 'number' || maxItems < 1 || maxItems > 10000) {
    throw new Error('maxItems must be a number between 1 and 10000');
  }

  return {
    searchQuery: raw.searchQuery.trim(),
    maxItems,
    location: typeof raw.location === 'string' ? raw.location : undefined,
    sectorCode: typeof raw.sectorCode === 'string' ? raw.sectorCode : undefined,
    includeContactDetails: raw.includeContactDetails === true,
    proxyConfiguration: raw.proxyConfiguration as ActorInput['proxyConfiguration'],
  };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- tests/validators.test.ts
```

Expected: PASS — all 9 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/utils/validators.ts tests/validators.test.ts
git commit -m "feat: add input validator with tests"
```

---

## Task 5: Proxy Utility

**Files:**
- Create: `src/utils/proxy.ts`

Note: This wraps Apify's `Actor.createProxyConfiguration`. No unit test — it delegates entirely to the Apify SDK.

- [ ] **Step 1: Create `src/utils/proxy.ts`**

```typescript
import { Actor } from 'apify';
import type { ProxyConfigurationOptions, ProxyConfiguration } from 'apify';

export async function createProxyConfiguration(
  options?: ProxyConfigurationOptions
): Promise<ProxyConfiguration | undefined> {
  const config = options ?? {
    groups: ['RESIDENTIAL'],
    countryCode: 'NL',
  };
  return Actor.createProxyConfiguration(config);
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/proxy.ts
git commit -m "feat: add proxy configuration helper (NL residential default)"
```

---

## Task 6: HTML Fixtures

**Files:**
- Create: `tests/fixtures/detail-page.html`
- Create: `tests/fixtures/search-page.html`

These are designed to match the placeholder CSS selectors defined in Task 7. Both are minimal stubs — replace with real captured HTML after a live run.

- [ ] **Step 1: Create `tests/fixtures/detail-page.html`**

```html
<!DOCTYPE html>
<!-- TODO: replace with real captured HTML from nl.kompass.com after live run -->
<html lang="nl">
<head><meta charset="UTF-8"><title>Test Bedrijf BV - Kompass</title></head>
<body>
  <h1 class="company-name">Test Bedrijf BV</h1>
  <span class="legal-form">BV</span>
  <span class="kvk-number">12345678</span>
  <span class="street-address">Teststraat 1</span>
  <span class="postal-code">1234 AB</span>
  <span class="city">Amsterdam</span>
  <span class="province">Noord-Holland</span>
  <span class="sector-code">A01</span>
  <span class="sector-name">Bouw</span>
  <span class="activity-description">Algemene bouwactiviteiten</span>
  <span class="employee-band">10-49</span>
  <span class="revenue-band">EUR1M-EUR5M</span>
  <span class="phone">+31 20 123 4567</span>
  <a class="website" href="https://testbedrijf.nl">Website</a>
  <a class="email" href="mailto:info@testbedrijf.nl">Email</a>
</body>
</html>
```

- [ ] **Step 2: Create `tests/fixtures/search-page.html`**

```html
<!DOCTYPE html>
<!-- TODO: replace with real captured HTML from nl.kompass.com after live run -->
<html lang="nl">
<head><meta charset="UTF-8"><title>Zoekresultaten - Kompass</title></head>
<body>
  <div class="results">
    <div class="company-card">
      <a href="/c/test-bedrijf-bv/NL001/">Test Bedrijf BV</a>
    </div>
    <div class="company-card">
      <a href="/c/another-company/NL002/">Another Company</a>
    </div>
    <div class="company-card">
      <a href="/c/derde-onderneming/NL003/">Derde Onderneming</a>
    </div>
  </div>
  <a class="next-page" href="/r/nl/nl/?text=bouw&page=2">Volgende</a>
</body>
</html>
```

- [ ] **Step 3: Commit**

```bash
git add tests/fixtures/detail-page.html tests/fixtures/search-page.html
git commit -m "test: add placeholder HTML fixtures for extractor tests"
```

---

## Task 7: Extractor and Tests (TDD)

**Files:**
- Create: `tests/extractor.test.ts`
- Create: `src/extractors/company.ts`

The extractor exports three named functions:
- `extractCompany(page, sourceUrl, includeContactDetails)` — used by the detail route
- `extractSearchLinks(page, baseUrl)` — used by the search route, returns absolute URLs
- `extractNextPageUrl(page, baseUrl)` — used by the search route, returns next page URL or null

- [ ] **Step 1: Write the failing tests**

Create `tests/extractor.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, Browser, Page } from 'playwright';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  extractCompany,
  extractSearchLinks,
  extractNextPageUrl,
} from '../src/extractors/company';

const DETAIL_URL = 'https://nl.kompass.com/c/test-bedrijf-bv/NL001/';
const BASE_URL = 'https://nl.kompass.com';

let browser: Browser;
let page: Page;

beforeAll(async () => {
  browser = await chromium.launch();
  page = await browser.newPage();
});

afterAll(async () => {
  await browser.close();
});

describe('extractCompany', () => {
  it('parses kompassId from URL slug', async () => {
    const html = readFileSync(join(__dirname, 'fixtures/detail-page.html'), 'utf-8');
    await page.setContent(html);
    const record = await extractCompany(page, DETAIL_URL, false);
    expect(record.kompassId).toBe('NL001');
  });

  it('returns a record with required string fields', async () => {
    const html = readFileSync(join(__dirname, 'fixtures/detail-page.html'), 'utf-8');
    await page.setContent(html);
    const record = await extractCompany(page, DETAIL_URL, false);

    expect(record.companyName).toBe('Test Bedrijf BV');
    expect(record.sourceUrl).toBe(DETAIL_URL);
    expect(record.scrapedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('never returns empty string for optional fields — only null', async () => {
    const html = readFileSync(join(__dirname, 'fixtures/detail-page.html'), 'utf-8');
    await page.setContent(html);
    const record = await extractCompany(page, DETAIL_URL, false);

    const optionalFields: (keyof typeof record)[] = [
      'kvkNumber', 'legalForm', 'streetAddress', 'postalCode', 'city',
      'province', 'sectorCode', 'sectorName', 'activityDescription',
      'employeeBand', 'revenueBand', 'phone', 'website', 'email',
    ];
    for (const field of optionalFields) {
      expect(record[field], `field "${field}" must not be empty string`).not.toBe('');
    }
  });

  it('returns null for phone/website/email when includeContactDetails is false', async () => {
    const html = readFileSync(join(__dirname, 'fixtures/detail-page.html'), 'utf-8');
    await page.setContent(html);
    const record = await extractCompany(page, DETAIL_URL, false);

    expect(record.phone).toBeNull();
    expect(record.website).toBeNull();
    expect(record.email).toBeNull();
  });

  it('extracts contact details when includeContactDetails is true', async () => {
    const html = readFileSync(join(__dirname, 'fixtures/detail-page.html'), 'utf-8');
    await page.setContent(html);
    const record = await extractCompany(page, DETAIL_URL, true);

    expect(record.phone).toBe('+31 20 123 4567');
    expect(record.website).toBe('https://testbedrijf.nl');
    expect(record.email).toBe('info@testbedrijf.nl');
  });
});

describe('extractSearchLinks', () => {
  it('returns absolute company card URLs', async () => {
    const html = readFileSync(join(__dirname, 'fixtures/search-page.html'), 'utf-8');
    await page.setContent(html, { url: BASE_URL });
    const links = await extractSearchLinks(page, BASE_URL);

    expect(links).toHaveLength(3);
    expect(links[0]).toBe('https://nl.kompass.com/c/test-bedrijf-bv/NL001/');
    expect(links[1]).toBe('https://nl.kompass.com/c/another-company/NL002/');
    expect(links[2]).toBe('https://nl.kompass.com/c/derde-onderneming/NL003/');
  });
});

describe('extractNextPageUrl', () => {
  it('returns the next page URL when present', async () => {
    const html = readFileSync(join(__dirname, 'fixtures/search-page.html'), 'utf-8');
    await page.setContent(html, { url: BASE_URL });
    const nextUrl = await extractNextPageUrl(page, BASE_URL);

    expect(nextUrl).toBe('https://nl.kompass.com/r/nl/nl/?text=bouw&page=2');
  });

  it('returns null when no next page link exists', async () => {
    await page.setContent('<html><body><p>No next page</p></body></html>');
    const nextUrl = await extractNextPageUrl(page, BASE_URL);

    expect(nextUrl).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- tests/extractor.test.ts
```

Expected: FAIL — "Cannot find module '../src/extractors/company'"

- [ ] **Step 3: Create `src/extractors/company.ts`**

```typescript
import type { Page } from 'playwright';
import type { CompanyRecord } from '../types';

// TODO: verify all selectors after capturing real HTML from nl.kompass.com
const DETAIL_SELECTORS = {
  companyName: '.company-name',                 // TODO: verify selector
  legalForm: '.legal-form',                     // TODO: verify selector
  kvkNumber: '.kvk-number',                     // TODO: verify selector
  streetAddress: '.street-address',             // TODO: verify selector
  postalCode: '.postal-code',                   // TODO: verify selector
  city: '.city',                                // TODO: verify selector
  province: '.province',                        // TODO: verify selector
  sectorCode: '.sector-code',                   // TODO: verify selector
  sectorName: '.sector-name',                   // TODO: verify selector
  activityDescription: '.activity-description', // TODO: verify selector
  employeeBand: '.employee-band',               // TODO: verify selector
  revenueBand: '.revenue-band',                 // TODO: verify selector
  phone: '.phone',                              // TODO: verify selector
  websiteLink: '.website',                      // TODO: verify selector
  emailLink: '.email',                          // TODO: verify selector
} as const;

const SEARCH_SELECTORS = {
  companyCardLink: 'a[href^="/c/"]', // TODO: verify selector
  nextPage: 'a.next-page',          // TODO: verify selector
} as const;

async function getText(page: Page, selector: string): Promise<string | null> {
  const el = await page.$(selector);
  if (!el) return null;
  const text = await el.textContent();
  return text?.trim() || null;
}

async function getAttr(page: Page, selector: string, attr: string): Promise<string | null> {
  const el = await page.$(selector);
  if (!el) return null;
  const value = await el.getAttribute(attr);
  return value?.trim() || null;
}

function parseKompassId(url: string): string {
  const match = url.match(/\/c\/[^/]+\/([^/]+)\//);
  return match?.[1] ?? url;
}

export async function extractCompany(
  page: Page,
  sourceUrl: string,
  includeContactDetails: boolean
): Promise<CompanyRecord> {
  let phone: string | null = null;
  let website: string | null = null;
  let email: string | null = null;

  if (includeContactDetails) {
    phone = await getText(page, DETAIL_SELECTORS.phone);
    website = await getAttr(page, DETAIL_SELECTORS.websiteLink, 'href');
    const emailHref = await getAttr(page, DETAIL_SELECTORS.emailLink, 'href');
    email = emailHref ? emailHref.replace(/^mailto:/i, '') : null;
  }

  return {
    kompassId: parseKompassId(sourceUrl),
    kvkNumber: await getText(page, DETAIL_SELECTORS.kvkNumber),
    companyName: (await getText(page, DETAIL_SELECTORS.companyName)) ?? 'Unknown',
    legalForm: await getText(page, DETAIL_SELECTORS.legalForm),
    streetAddress: await getText(page, DETAIL_SELECTORS.streetAddress),
    postalCode: await getText(page, DETAIL_SELECTORS.postalCode),
    city: await getText(page, DETAIL_SELECTORS.city),
    province: await getText(page, DETAIL_SELECTORS.province),
    sectorCode: await getText(page, DETAIL_SELECTORS.sectorCode),
    sectorName: await getText(page, DETAIL_SELECTORS.sectorName),
    activityDescription: await getText(page, DETAIL_SELECTORS.activityDescription),
    employeeBand: await getText(page, DETAIL_SELECTORS.employeeBand),
    revenueBand: await getText(page, DETAIL_SELECTORS.revenueBand),
    phone,
    website,
    email,
    sourceUrl,
    scrapedAt: new Date().toISOString(),
  };
}

export async function extractSearchLinks(page: Page, baseUrl: string): Promise<string[]> {
  const elements = await page.$$(SEARCH_SELECTORS.companyCardLink);
  const links: string[] = [];
  for (const el of elements) {
    const href = await el.getAttribute('href');
    if (href) {
      links.push(new URL(href, baseUrl).toString());
    }
  }
  return links;
}

export async function extractNextPageUrl(page: Page, baseUrl: string): Promise<string | null> {
  const el = await page.$(SEARCH_SELECTORS.nextPage);
  if (!el) return null;
  const href = await el.getAttribute('href');
  return href ? new URL(href, baseUrl).toString() : null;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- tests/extractor.test.ts
```

Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/extractors/company.ts tests/extractor.test.ts
git commit -m "feat: add company extractor with placeholder selectors and tests"
```

---

## Task 8: Search Route

**Files:**
- Create: `src/routes/search.ts`

- [ ] **Step 1: Create `src/routes/search.ts`**

```typescript
import { Actor, log } from 'apify';
import type { PlaywrightCrawlingContext } from 'crawlee';
import type { ActorInput } from '../types';
import { extractSearchLinks, extractNextPageUrl } from '../extractors/company';

export async function handleSearch(
  ctx: PlaywrightCrawlingContext,
  input: ActorInput
): Promise<void> {
  const { page, request } = ctx;
  const baseUrl = new URL(request.url).origin;

  let itemCount = (await Actor.getValue<number>('itemCount')) ?? 0;

  const links = await extractSearchLinks(page, baseUrl);
  const toEnqueue: string[] = [];

  for (const link of links) {
    if (itemCount >= input.maxItems) break;
    toEnqueue.push(link);
    itemCount++;
  }

  if (toEnqueue.length > 0) {
    await ctx.addRequests(
      toEnqueue.map((url) => ({ url, label: 'DETAIL' }))
    );
  }

  await Actor.setValue('itemCount', itemCount);
  log.info('Search page processed', {
    url: request.url,
    enqueued: toEnqueue.length,
    totalEnqueued: itemCount,
  });

  if (itemCount < input.maxItems) {
    const nextUrl = await extractNextPageUrl(page, baseUrl);
    if (nextUrl) {
      await ctx.addRequests([{ url: nextUrl, label: 'SEARCH' }]);
      log.info('Enqueued next search page', { url: nextUrl });
    }
  }
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/search.ts
git commit -m "feat: add search route with pagination and maxItems enforcement"
```

---

## Task 9: Detail Route

**Files:**
- Create: `src/routes/detail.ts`

- [ ] **Step 1: Create `src/routes/detail.ts`**

```typescript
import { Actor, log } from 'apify';
import type { PlaywrightCrawlingContext } from 'crawlee';
import type { ActorInput } from '../types';
import { extractCompany } from '../extractors/company';

export async function handleDetail(
  ctx: PlaywrightCrawlingContext,
  input: ActorInput
): Promise<void> {
  const { page, request } = ctx;

  const record = await extractCompany(page, request.url, input.includeContactDetails);
  await Actor.pushData(record);

  log.info('Company scraped', {
    kompassId: record.kompassId,
    name: record.companyName,
  });
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/detail.ts
git commit -m "feat: add detail route — extract and push one CompanyRecord"
```

---

## Task 10: Main Entry Point

**Files:**
- Create: `src/main.ts`

- [ ] **Step 1: Create `src/main.ts`**

```typescript
import { Actor, log } from 'apify';
import { PlaywrightCrawler, createPlaywrightRouter } from 'crawlee';
import { validateInput } from './utils/validators';
import { createProxyConfiguration } from './utils/proxy';
import { handleSearch } from './routes/search';
import { handleDetail } from './routes/detail';

function buildSearchUrl(query: string, location: string | undefined, page: number): string {
  const params = new URLSearchParams({ text: query, page: String(page) });
  if (location) params.set('localization', location);
  return `https://nl.kompass.com/r/nl/nl/?${params.toString()}`;
}

await Actor.main(async () => {
  const rawInput = await Actor.getInput();
  const input = validateInput(rawInput);

  const proxyConfiguration = await createProxyConfiguration(input.proxyConfiguration);

  const router = createPlaywrightRouter();
  router.addHandler('SEARCH', (ctx) => handleSearch(ctx, input));
  router.addHandler('DETAIL', (ctx) => handleDetail(ctx, input));

  const crawler = new PlaywrightCrawler({
    requestHandler: router,
    proxyConfiguration,
    launchContext: {
      useChrome: true,
    },
    minConcurrency: 1,
    maxConcurrency: 3,
    preNavigationHooks: [
      async ({ page }) => {
        const timeoutMs = (Math.floor(Math.random() * 16) + 15) * 1000;
        page.setDefaultNavigationTimeout(timeoutMs);
      },
    ],
  });

  await Actor.setValue('itemCount', 0);

  const startUrl = buildSearchUrl(input.searchQuery, input.location, 1);
  log.info('Starting Kompass scrape', {
    searchQuery: input.searchQuery,
    location: input.location,
    maxItems: input.maxItems,
    startUrl,
  });

  await crawler.run([{ url: startUrl, label: 'SEARCH' }]);

  const itemCount = (await Actor.getValue<number>('itemCount')) ?? 0;
  log.info('Scrape complete', { itemsEnqueued: itemCount });
});
```

- [ ] **Step 2: Build TypeScript**

```bash
npm run build
```

Expected: `dist/` directory created, no errors.

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/main.ts dist/
git commit -m "feat: wire main entry point — Actor.main, crawler, router, stats logging"
```

---

## Task 11: README and Final Checks

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace `README.md`**

```markdown
# Kompass Dutch Company Enrichment Scraper

Scrapes enriched Dutch company data from [nl.kompass.com](https://nl.kompass.com), filling the gap between the anonymised KVK open dataset and what B2B sales teams actually need.

## What it extracts

For each company: name, legal form, KVK number, address, province, SIC/sector code, employee band, revenue band, and optionally phone, email, and website.

## Input

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `searchQuery` | string | yes | — | Company name, SIC keyword, or city |
| `maxItems` | integer | no | 100 | Max records (max 10 000) |
| `location` | string | no | — | City or province, e.g. `Rotterdam` |
| `sectorCode` | string | no | — | Kompass sector/SIC filter code |
| `includeContactDetails` | boolean | no | false | Also scrape phone/email/website |
| `proxyConfiguration` | object | no | — | Apify proxy settings |

## Output

Each record in the dataset:

- `kompassId` — Kompass internal ID from URL slug
- `kvkNumber` — KVK number if shown on page, otherwise null
- `companyName` — Company name
- `legalForm` — BV, NV, VOF, eenmanszaak, etc., or null
- `streetAddress`, `postalCode`, `city`, `province` — Address fields
- `sectorCode`, `sectorName`, `activityDescription` — Industry classification
- `employeeBand` — e.g. "10-49"
- `revenueBand` — e.g. "EUR1M-EUR5M"
- `phone`, `website`, `email` — Only populated when `includeContactDetails` is true
- `sourceUrl` — The Kompass detail page URL
- `scrapedAt` — ISO 8601 timestamp

## Usage

Install dependencies and Playwright browser:

    npm install
    npx playwright install chromium

Run locally with a small query to verify:

    apify run --input='{"searchQuery":"bouw","maxItems":10}'

Run tests:

    npm test

Deploy to Apify:

    apify push

## Notes

- Uses Playwright with residential NL proxies — Kompass requires JS rendering
- Concurrency capped at 3 to avoid rate limiting
- `includeContactDetails` is slower and uses more Apify compute units
- Output schema is stable — field names will not change between versions
- If most fields return null after a live run, check selectors in `src/extractors/company.ts`
```

- [ ] **Step 2: Run full lint check**

```bash
npm run lint
```

Expected: No errors or warnings.

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: update README for Kompass scraper — input/output schema and usage"
```

---

## Post-Implementation: Selector Update Workflow

The selectors in `src/extractors/company.ts` are placeholders. After completing the implementation, update them:

1. Add a temporary `log.info(await page.content())` line in `handleDetail` in `src/routes/detail.ts`
2. Run `apify run --input='{"searchQuery":"bouw","maxItems":1}'` locally
3. Copy the logged HTML, inspect it for the real CSS selectors for each field
4. Remove the temporary log line
5. Replace every `// TODO: verify selector` entry in `DETAIL_SELECTORS` and `SEARCH_SELECTORS` in `src/extractors/company.ts`
6. Replace `tests/fixtures/detail-page.html` and `tests/fixtures/search-page.html` with the real captured HTML
7. Run `npm test` — all tests should pass with real data values
8. Commit the updated selectors and fixtures
