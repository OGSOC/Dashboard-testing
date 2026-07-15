import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { holdings, watchlist } from '../db/schema.js';

export async function getTrackedTickersForUser(userId: string): Promise<string[]> {
  const [heldRows, watchedRows] = await Promise.all([
    db.select({ ticker: holdings.ticker }).from(holdings).where(eq(holdings.userId, userId)),
    db.select({ ticker: watchlist.ticker }).from(watchlist).where(eq(watchlist.userId, userId)),
  ]);
  return Array.from(new Set([...heldRows.map((r) => r.ticker), ...watchedRows.map((r) => r.ticker)]));
}

export async function getAllTrackedTickers(): Promise<Map<string, string[]>> {
  const [heldRows, watchedRows] = await Promise.all([
    db.select({ userId: holdings.userId, ticker: holdings.ticker }).from(holdings),
    db.select({ userId: watchlist.userId, ticker: watchlist.ticker }).from(watchlist),
  ]);
  const byUser = new Map<string, Set<string>>();
  for (const row of [...heldRows, ...watchedRows]) {
    if (!byUser.has(row.userId)) byUser.set(row.userId, new Set());
    byUser.get(row.userId)!.add(row.ticker);
  }
  const result = new Map<string, string[]>();
  for (const [userId, tickers] of byUser) result.set(userId, Array.from(tickers));
  return result;
}
