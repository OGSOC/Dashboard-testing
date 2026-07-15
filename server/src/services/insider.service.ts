import { desc, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { insiderTrades } from '../db/schema.js';
import { insiderProvider, recordProviderRun } from '../providers/index.js';
import { providerConfig } from '../config/env.js';

export async function refreshInsiderTradesForTicker(ticker: string) {
  const insertedRows: (typeof insiderTrades.$inferSelect)[] = [];
  try {
    const items = await insiderProvider.getInsiderTradesForTicker(ticker);
    for (const item of items) {
      const result = await db
        .insert(insiderTrades)
        .values({
          ticker: item.ticker,
          insiderName: item.insiderName,
          insiderTitle: item.insiderTitle,
          transactionType: item.transactionType,
          transactionDate: item.transactionDate,
          shares: item.shares.toFixed(2),
          price: item.price?.toFixed(6),
          sharesOwnedAfter: item.sharesOwnedAfter?.toFixed(2),
          filingUrl: item.filingUrl,
          provider: item.provider,
          externalId: item.externalId,
        })
        .onConflictDoNothing({ target: [insiderTrades.provider, insiderTrades.externalId] })
        .returning();
      insertedRows.push(...result);
    }
    await recordProviderRun(insiderProvider.name, providerConfig.finnhub, insiderProvider.name === 'seed', null);
    return insertedRows;
  } catch (err) {
    await recordProviderRun(insiderProvider.name, providerConfig.finnhub, insiderProvider.name === 'seed', String(err));
    return insertedRows;
  }
}

export async function getInsiderTradesForTickers(tickers: string[], limit = 50) {
  if (tickers.length === 0) return [];
  const rows = await db
    .select()
    .from(insiderTrades)
    .where(inArray(insiderTrades.ticker, tickers))
    .orderBy(desc(insiderTrades.transactionDate))
    .limit(limit);
  return rows.map((r) => ({
    ...r,
    shares: Number(r.shares),
    price: r.price !== null ? Number(r.price) : null,
    sharesOwnedAfter: r.sharesOwnedAfter !== null ? Number(r.sharesOwnedAfter) : null,
  }));
}
