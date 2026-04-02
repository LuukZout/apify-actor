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
