import { desc, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { whaleTrades } from '../db/schema.js';
import { whaleProvider, recordProviderRun } from '../providers/index.js';
import { providerConfig } from '../config/env.js';

export async function refreshWhaleTradesForTicker(ticker: string) {
  const insertedRows: (typeof whaleTrades.$inferSelect)[] = [];
  try {
    const items = await whaleProvider.getWhaleTradesForTicker(ticker);
    for (const item of items) {
      const result = await db
        .insert(whaleTrades)
        .values({
          ticker: item.ticker,
          institutionName: item.institutionName,
          institutionCik: item.institutionCik,
          filingType: item.filingType,
          quarter: item.quarter,
          shares: item.shares.toFixed(2),
          sharesChange: item.sharesChange?.toFixed(2),
          valueUsd: item.valueUsd?.toFixed(2),
          action: item.action,
          filedDate: item.filedDate,
          provider: item.provider,
          externalId: item.externalId,
        })
        .onConflictDoNothing({ target: [whaleTrades.provider, whaleTrades.externalId] })
        .returning();
      insertedRows.push(...result);
    }
    await recordProviderRun(whaleProvider.name, providerConfig.secEdgar, whaleProvider.name === 'seed', null);
    return insertedRows;
  } catch (err) {
    await recordProviderRun(whaleProvider.name, providerConfig.secEdgar, whaleProvider.name === 'seed', String(err));
    return insertedRows;
  }
}

export async function getWhaleTradesForTickers(tickers: string[], limit = 50) {
  if (tickers.length === 0) return [];
  const rows = await db
    .select()
    .from(whaleTrades)
    .where(inArray(whaleTrades.ticker, tickers))
    .orderBy(desc(whaleTrades.filedDate))
    .limit(limit);
  return rows.map((r) => ({
    ...r,
    shares: Number(r.shares),
    sharesChange: r.sharesChange !== null ? Number(r.sharesChange) : null,
    valueUsd: r.valueUsd !== null ? Number(r.valueUsd) : null,
  }));
}
