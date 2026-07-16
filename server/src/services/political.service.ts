import { desc, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { politicalTrades } from '../db/schema.js';
import { politicalProviders, recordProviderRun } from '../providers/index.js';
import { seedPoliticalTrades } from '../providers/seed/data.js';

/** Polls both House and Senate Stock Watcher (free, no key). Falls back to seed data only if both fail. */
export async function refreshPoliticalTrades() {
  const insertedRows: (typeof politicalTrades.$inferSelect)[] = [];
  let anySucceeded = false;

  for (const provider of politicalProviders) {
    try {
      const items = await provider.getRecentTrades();
      for (const item of items) {
        const result = await db
          .insert(politicalTrades)
          .values({
            ticker: item.ticker,
            politicianName: item.politicianName,
            chamber: item.chamber,
            party: item.party,
            transactionType: item.transactionType,
            transactionDate: item.transactionDate,
            disclosureDate: item.disclosureDate,
            amountRange: item.amountRange,
            provider: item.provider,
            externalId: item.externalId,
          })
          .onConflictDoNothing({ target: [politicalTrades.provider, politicalTrades.externalId] })
          .returning();
        insertedRows.push(...result);
      }
      anySucceeded = true;
      await recordProviderRun(provider.name, true, false, null);
    } catch (err) {
      // This source is unreachable right now (e.g. the free community dataset is down) — the
      // sibling source and/or seed data still cover this chamber, so treat it the same as any
      // other "falling back to sample data" case rather than a scary unexplained error.
      await recordProviderRun(provider.name, true, true, String(err));
    }
  }

  if (!anySucceeded) {
    for (const item of seedPoliticalTrades) {
      const result = await db
        .insert(politicalTrades)
        .values(item)
        .onConflictDoNothing({ target: [politicalTrades.provider, politicalTrades.externalId] })
        .returning();
      insertedRows.push(...result);
    }
  }

  return insertedRows;
}

export async function getPoliticalTradesForTickers(tickers: string[], limit = 50) {
  if (tickers.length === 0) return [];
  return db
    .select()
    .from(politicalTrades)
    .where(inArray(politicalTrades.ticker, tickers))
    .orderBy(desc(politicalTrades.transactionDate))
    .limit(limit);
}

export async function getAllRecentPoliticalTrades(limit = 100) {
  return db.select().from(politicalTrades).orderBy(desc(politicalTrades.transactionDate)).limit(limit);
}
