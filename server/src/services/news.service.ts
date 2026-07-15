import { desc, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { newsCache } from '../db/schema.js';
import { newsProvider, recordProviderRun } from '../providers/index.js';
import { providerConfig } from '../config/env.js';

export async function refreshNewsForTicker(ticker: string) {
  const insertedRows: (typeof newsCache.$inferSelect)[] = [];
  try {
    const items = await newsProvider.getNewsForTicker(ticker);
    for (const item of items) {
      const result = await db
        .insert(newsCache)
        .values({
          ticker: item.ticker,
          headline: item.headline,
          summary: item.summary,
          url: item.url,
          source: item.source,
          imageUrl: item.imageUrl,
          publishedAt: new Date(item.publishedAt),
          provider: item.provider,
          externalId: item.externalId,
        })
        .onConflictDoNothing({ target: [newsCache.provider, newsCache.externalId] })
        .returning();
      insertedRows.push(...result);
    }
    await recordProviderRun(newsProvider.name, providerConfig.finnhub, newsProvider.name === 'seed', null);
    return insertedRows;
  } catch (err) {
    await recordProviderRun(newsProvider.name, providerConfig.finnhub, newsProvider.name === 'seed', String(err));
    return insertedRows;
  }
}

export async function getNewsForTickers(tickers: string[], limit = 50) {
  if (tickers.length === 0) return [];
  return db
    .select()
    .from(newsCache)
    .where(inArray(newsCache.ticker, tickers))
    .orderBy(desc(newsCache.publishedAt))
    .limit(limit);
}
