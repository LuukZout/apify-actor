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
  websiteLink: 'a.website',                     // TODO: verify selector
  emailLink: 'a.email',                         // TODO: verify selector
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
