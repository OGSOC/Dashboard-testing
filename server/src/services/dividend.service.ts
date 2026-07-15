import { and, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { dividendSchedule, holdings, transactions } from '../db/schema.js';
import { dividendProvider, recordProviderRun } from '../providers/index.js';
import { providerConfig } from '../config/env.js';

export async function refreshDividendsForTicker(ticker: string): Promise<void> {
  try {
    const entries = await dividendProvider.getDividendsForTicker(ticker);
    for (const entry of entries) {
      await db
        .insert(dividendSchedule)
        .values({
          ticker: entry.ticker,
          exDividendDate: entry.exDividendDate,
          payDate: entry.payDate,
          recordDate: entry.recordDate,
          declaredDate: entry.declaredDate,
          amount: entry.amount.toFixed(4),
          currency: entry.currency,
          source: entry.source,
        })
        .onConflictDoUpdate({
          target: [dividendSchedule.ticker, dividendSchedule.exDividendDate],
          set: { amount: entry.amount.toFixed(4), payDate: entry.payDate, recordDate: entry.recordDate, declaredDate: entry.declaredDate, fetchedAt: new Date() },
        });
    }
    await recordProviderRun(dividendProvider.name, providerConfig.alphaVantage, dividendProvider.name === 'seed', null);
  } catch (err) {
    await recordProviderRun(dividendProvider.name, providerConfig.alphaVantage, dividendProvider.name === 'seed', String(err));
  }
}

/** Refreshes dividend data for up to `limit` of the stalest tracked tickers — keeps us within Alpha Vantage's tight free-tier daily quota. */
export async function refreshStaleDividends(tickers: string[], limit: number): Promise<void> {
  if (tickers.length === 0) return;
  const existing = await db
    .select({ ticker: dividendSchedule.ticker, fetchedAt: dividendSchedule.fetchedAt })
    .from(dividendSchedule)
    .where(inArray(dividendSchedule.ticker, tickers));

  const latestFetchByTicker = new Map<string, Date>();
  for (const row of existing) {
    const prev = latestFetchByTicker.get(row.ticker);
    if (!prev || row.fetchedAt > prev) latestFetchByTicker.set(row.ticker, row.fetchedAt);
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const stale = tickers
    .filter((t) => !latestFetchByTicker.has(t) || latestFetchByTicker.get(t)! < sevenDaysAgo)
    .slice(0, limit);

  for (const ticker of stale) {
    await refreshDividendsForTicker(ticker);
  }
}

export async function getDividendCalendar(tickers: string[]) {
  if (tickers.length === 0) return [];
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const to = new Date();
  to.setDate(to.getDate() + 120);

  const rows = await db
    .select()
    .from(dividendSchedule)
    .where(
      and(
        inArray(dividendSchedule.ticker, tickers),
        gte(dividendSchedule.exDividendDate, from.toISOString().slice(0, 10)),
        lte(dividendSchedule.exDividendDate, to.toISOString().slice(0, 10)),
      ),
    )
    .orderBy(dividendSchedule.exDividendDate);
  return rows.map((r) => ({ ...r, amount: Number(r.amount) }));
}

export async function getDividendHistory(ticker: string) {
  const rows = await db.select().from(dividendSchedule).where(eq(dividendSchedule.ticker, ticker)).orderBy(dividendSchedule.exDividendDate);
  return rows.map((r) => ({ ...r, amount: Number(r.amount) }));
}

export async function getDividendSummary(userId: string) {
  const ytdStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const trailing12mStart = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [ytdRows, trailingRows, heldRows] = await Promise.all([
    db
      .select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.transactionType, 'dividend'), gte(transactions.tradeDate, ytdStart))),
    db
      .select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.transactionType, 'dividend'), gte(transactions.tradeDate, trailing12mStart))),
    db.select().from(holdings).where(eq(holdings.userId, userId)),
  ]);

  const tickers = heldRows.map((h) => h.ticker);
  const upcoming = tickers.length
    ? await db
        .select()
        .from(dividendSchedule)
        .where(
          and(
            inArray(dividendSchedule.ticker, tickers),
            gte(dividendSchedule.exDividendDate, new Date().toISOString().slice(0, 10)),
          ),
        )
    : [];

  const projectedByTicker = new Map<string, number>();
  for (const entry of upcoming) {
    const held = heldRows.find((h) => h.ticker === entry.ticker);
    if (!held) continue;
    const projected = Number(entry.amount) * Number(held.quantity);
    projectedByTicker.set(entry.ticker, (projectedByTicker.get(entry.ticker) ?? 0) + projected);
  }

  const yieldOnCostByTicker = heldRows
    .map((h) => {
      // Approximate annual income as the most recent scheduled dividend amount x 4 (quarterly assumption).
      const latest = upcoming
        .filter((e) => e.ticker === h.ticker)
        .sort((a, b) => a.exDividendDate.localeCompare(b.exDividendDate))[0];
      const annualIncome = latest ? Number(latest.amount) * 4 * Number(h.quantity) : 0;
      const totalCost = Number(h.totalCost);
      return {
        ticker: h.ticker,
        annualIncome,
        yieldOnCost: totalCost > 0 ? (annualIncome / totalCost) * 100 : 0,
      };
    })
    .filter((r) => r.annualIncome > 0);

  return {
    totalReceivedYtd: Number(ytdRows[0]?.total ?? 0),
    totalReceivedTrailing12m: Number(trailingRows[0]?.total ?? 0),
    projectedNext12m: Array.from(projectedByTicker.values()).reduce((a, b) => a + b, 0),
    yieldOnCostByTicker,
  };
}
