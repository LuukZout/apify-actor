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
