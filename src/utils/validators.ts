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
