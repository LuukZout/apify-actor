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

  it('falls back to "Unknown" when companyName selector is absent', async () => {
    await page.setContent('<html><body><span class="city">Amsterdam</span></body></html>');
    const record = await extractCompany(page, DETAIL_URL, false);
    expect(record.companyName).toBe('Unknown');
  });

  it('falls back to full URL as kompassId when URL does not match pattern', async () => {
    const html = readFileSync(join(__dirname, 'fixtures/detail-page.html'), 'utf-8');
    await page.setContent(html);
    const malformedUrl = 'https://nl.kompass.com/some-other-path/';
    const record = await extractCompany(page, malformedUrl, false);
    expect(record.kompassId).toBe(malformedUrl);
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
