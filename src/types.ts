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
