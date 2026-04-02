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

Actor.main(async () => {
    const rawInput = await Actor.getInput();
    const input = validateInput(rawInput);

    if (input.sectorCode) {
      log.warning('sectorCode input is set but not yet wired into the search URL — the filter will not be applied. Update buildSearchUrl once the Kompass URL parameter name is confirmed.');
    }

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

    const existingCount = await Actor.getValue<number>('itemCount');
    if (existingCount === null) {
      await Actor.setValue('itemCount', 0);
    }

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
