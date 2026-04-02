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
