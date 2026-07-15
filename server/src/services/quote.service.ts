import { eq, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { quoteCache } from '../db/schema.js';
import { quoteProvider, recordProviderRun } from '../providers/index.js';
import { providerConfig } from '../config/env.js';

const STALE_MS = 15 * 60 * 1000;

export async function getQuotesForTickers(tickers: string[]): Promise<Record<string, { lastPrice: number; changePct: number | null }>> {
  const uniqueTickers = Array.from(new Set(tickers.map((t) => t.toUpperCase())));
  if (uniqueTickers.length === 0) return {};

  const cached = await db.select().from(quoteCache).where(inArray(quoteCache.ticker, uniqueTickers));
  const cachedByTicker = new Map(cached.map((c) => [c.ticker, c]));

  const now = Date.now();
  const staleTickers = uniqueTickers.filter((t) => {
    const c = cachedByTicker.get(t);
    return !c || now - new Date(c.fetchedAt).getTime() > STALE_MS;
  });

  for (const ticker of staleTickers) {
    try {
      const quote = await quoteProvider.getQuote(ticker);
      if (quote) {
        await db
          .insert(quoteCache)
          .values({
            ticker,
            lastPrice: quote.lastPrice.toFixed(6),
            previousClose: quote.previousClose?.toFixed(6),
            changePct: quote.changePct?.toFixed(4),
            currency: quote.currency,
            provider: quoteProvider.name,
          })
          .onConflictDoUpdate({
            target: quoteCache.ticker,
            set: {
              lastPrice: quote.lastPrice.toFixed(6),
              previousClose: quote.previousClose?.toFixed(6),
              changePct: quote.changePct?.toFixed(4),
              currency: quote.currency,
              provider: quoteProvider.name,
              fetchedAt: new Date(),
            },
          });
        cachedByTicker.set(ticker, {
          ticker,
          lastPrice: quote.lastPrice.toFixed(6),
          previousClose: quote.previousClose?.toFixed(6) ?? null,
          changePct: quote.changePct?.toFixed(4) ?? null,
          currency: quote.currency,
          provider: quoteProvider.name,
          fetchedAt: new Date(),
        });
      }
      await recordProviderRun(quoteProvider.name, providerConfig.finnhub, quoteProvider.name === 'seed', null);
    } catch (err) {
      await recordProviderRun(quoteProvider.name, providerConfig.finnhub, quoteProvider.name === 'seed', String(err));
    }
  }

  const result: Record<string, { lastPrice: number; changePct: number | null }> = {};
  for (const [ticker, row] of cachedByTicker) {
    result[ticker] = { lastPrice: Number(row.lastPrice), changePct: row.changePct !== null ? Number(row.changePct) : null };
  }
  return result;
}
