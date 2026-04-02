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
