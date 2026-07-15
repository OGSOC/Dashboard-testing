import { and, eq, gte, inArray, lte } from 'drizzle-orm';
import { db } from '../db/client.js';
import { dividendSchedule, holdings, transactions, brokerageAccounts } from '../db/schema.js';
import { dividendProvider, recordProviderRun } from '../providers/index.js';
import { providerConfig } from '../config/env.js';
import { getCrossRate, getRateFromUsd } from './fx.service.js';

/** Returns any brand-new (not-previously-seen) ex-dividend-date rows, so callers can detect dividend increases. */
export async function refreshDividendsForTicker(ticker: string) {
  const newRows: (typeof dividendSchedule.$inferSelect)[] = [];
  try {
    const entries = await dividendProvider.getDividendsForTicker(ticker);
    for (const entry of entries) {
      const inserted = await db
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
        .onConflictDoNothing({ target: [dividendSchedule.ticker, dividendSchedule.exDividendDate] })
        .returning();
      newRows.push(...inserted);
    }
    await recordProviderRun(dividendProvider.name, providerConfig.alphaVantage, dividendProvider.name === 'seed', null);
  } catch (err) {
    await recordProviderRun(dividendProvider.name, providerConfig.alphaVantage, dividendProvider.name === 'seed', String(err));
  }
  return newRows;
}

/** Refreshes dividend data for up to `limit` of the stalest tracked tickers — keeps us within Alpha Vantage's tight free-tier daily quota. Returns any newly-seen ex-dividend-date rows (per ticker), for growth-notification checks. */
export async function refreshStaleDividends(tickers: string[], limit: number): Promise<Map<string, (typeof dividendSchedule.$inferSelect)[]>> {
  const result = new Map<string, (typeof dividendSchedule.$inferSelect)[]>();
  if (tickers.length === 0) return result;
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
    result.set(ticker, await refreshDividendsForTicker(ticker));
  }
  return result;
}

export async function getDividendCalendar(tickers: string[], displayCurrency = 'GBP') {
  if (tickers.length === 0) return [];
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const to = new Date();
  to.setDate(to.getDate() + 365);

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
  const usdRate = await getRateFromUsd(displayCurrency as never);
  return rows.map((r) => ({ ...r, amount: Number(r.amount) * usdRate, currency: displayCurrency }));
}

export async function getDividendHistory(ticker: string) {
  const rows = await db.select().from(dividendSchedule).where(eq(dividendSchedule.ticker, ticker)).orderBy(dividendSchedule.exDividendDate);
  return rows.map((r) => ({ ...r, amount: Number(r.amount) }));
}

/** Converts a set of transactions (each carrying its own recorded currency) into a single display currency and sums them. */
async function sumConverted(rows: { amount: string; currency: string }[], displayCurrency: string): Promise<number> {
  const currencies = Array.from(new Set(rows.map((r) => r.currency)));
  const rateByCurrency = new Map<string, number>(
    await Promise.all(currencies.map(async (c) => [c, await getCrossRate(c, displayCurrency)] as [string, number])),
  );
  return rows.reduce((sum, r) => sum + Number(r.amount) * (rateByCurrency.get(r.currency) ?? 1), 0);
}

export async function getDividendSummary(userId: string, displayCurrency = 'GBP') {
  const ytdStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const trailing12mStart = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [ytdRows, trailingRows, heldRows] = await Promise.all([
    db
      .select({ amount: transactions.amount, currency: transactions.currency })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.transactionType, 'dividend'), gte(transactions.tradeDate, ytdStart))),
    db
      .select({ amount: transactions.amount, currency: transactions.currency })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.transactionType, 'dividend'), gte(transactions.tradeDate, trailing12mStart))),
    db
      .select({ ticker: holdings.ticker, quantity: holdings.quantity, totalCost: holdings.totalCost, accountCurrency: brokerageAccounts.currency })
      .from(holdings)
      .innerJoin(brokerageAccounts, eq(holdings.brokerageAccountId, brokerageAccounts.id))
      .where(eq(holdings.userId, userId)),
  ]);

  const [totalReceivedYtd, totalReceivedTrailing12m] = await Promise.all([
    sumConverted(ytdRows, displayCurrency),
    sumConverted(trailingRows, displayCurrency),
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

  const usdRate = await getRateFromUsd(displayCurrency as never);
  const accountCurrencies = Array.from(new Set(heldRows.map((h) => h.accountCurrency)));
  const costRateByCurrency = new Map<string, number>(
    await Promise.all(accountCurrencies.map(async (c) => [c, await getCrossRate(c, displayCurrency)] as [string, number])),
  );

  const projectedByTicker = new Map<string, number>();
  for (const entry of upcoming) {
    const held = heldRows.find((h) => h.ticker === entry.ticker);
    if (!held) continue;
    const projected = Number(entry.amount) * usdRate * Number(held.quantity);
    projectedByTicker.set(entry.ticker, (projectedByTicker.get(entry.ticker) ?? 0) + projected);
  }

  const yieldOnCostByTicker = heldRows
    .map((h) => {
      // Approximate annual income as the most recent scheduled dividend amount x 4 (quarterly assumption).
      const latest = upcoming
        .filter((e) => e.ticker === h.ticker)
        .sort((a, b) => a.exDividendDate.localeCompare(b.exDividendDate))[0];
      const annualIncome = latest ? Number(latest.amount) * usdRate * 4 * Number(h.quantity) : 0;
      const costRate = costRateByCurrency.get(h.accountCurrency) ?? 1;
      const totalCost = Number(h.totalCost) * costRate;
      return {
        ticker: h.ticker,
        annualIncome,
        yieldOnCost: totalCost > 0 ? (annualIncome / totalCost) * 100 : 0,
      };
    })
    .filter((r) => r.annualIncome > 0);

  return {
    currency: displayCurrency,
    totalReceivedYtd,
    totalReceivedTrailing12m,
    projectedNext12m: Array.from(projectedByTicker.values()).reduce((a, b) => a + b, 0),
    yieldOnCostByTicker,
  };
}

export async function getMonthlyIncome(userId: string, year: number, displayCurrency = 'GBP') {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const rows = await db
    .select({ amount: transactions.amount, currency: transactions.currency, tradeDate: transactions.tradeDate })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.transactionType, 'dividend'),
        gte(transactions.tradeDate, yearStart),
        lte(transactions.tradeDate, yearEnd),
      ),
    );

  const currencies = Array.from(new Set(rows.map((r) => r.currency)));
  const rateByCurrency = new Map<string, number>(
    await Promise.all(currencies.map(async (c) => [c, await getCrossRate(c, displayCurrency)] as [string, number])),
  );

  const byMonth = Array.from({ length: 12 }, () => 0);
  for (const r of rows) {
    const month = Number(r.tradeDate.slice(5, 7)) - 1;
    byMonth[month] += Number(r.amount) * (rateByCurrency.get(r.currency) ?? 1);
  }
  return byMonth.map((total, i) => ({ month: i + 1, total }));
}

export async function getYearlyIncome(userId: string, displayCurrency = 'GBP') {
  const rows = await db
    .select({ amount: transactions.amount, currency: transactions.currency, tradeDate: transactions.tradeDate })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.transactionType, 'dividend')));

  const currencies = Array.from(new Set(rows.map((r) => r.currency)));
  const rateByCurrency = new Map<string, number>(
    await Promise.all(currencies.map(async (c) => [c, await getCrossRate(c, displayCurrency)] as [string, number])),
  );

  const byYear = new Map<number, number>();
  for (const r of rows) {
    const year = Number(r.tradeDate.slice(0, 4));
    byYear.set(year, (byYear.get(year) ?? 0) + Number(r.amount) * (rateByCurrency.get(r.currency) ?? 1));
  }
  return Array.from(byYear.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, total]) => ({ year, total }));
}

interface TickerGrowth {
  ticker: string;
  cagr: number | null;
  yearsOfData: number;
  annualTotals: { year: number; total: number }[];
}

/** Dividend growth CAGR per ticker, computed from the full dividend_schedule history (ex-dividend amounts summed by calendar year). */
export async function getDividendGrowth(tickers: string[]): Promise<TickerGrowth[]> {
  if (tickers.length === 0) return [];
  const rows = await db.select().from(dividendSchedule).where(inArray(dividendSchedule.ticker, tickers));

  const byTicker = new Map<string, Map<number, { total: number; count: number }>>();
  for (const r of rows) {
    const year = Number(r.exDividendDate.slice(0, 4));
    if (year > new Date().getFullYear()) continue; // skip future-dated entries
    if (!byTicker.has(r.ticker)) byTicker.set(r.ticker, new Map());
    const yearMap = byTicker.get(r.ticker)!;
    const existing = yearMap.get(year) ?? { total: 0, count: 0 };
    yearMap.set(year, { total: existing.total + Number(r.amount), count: existing.count + 1 });
  }

  return tickers.map((ticker) => {
    const yearMap = byTicker.get(ticker);
    if (!yearMap || yearMap.size < 2) {
      return { ticker, cagr: null, yearsOfData: yearMap?.size ?? 0, annualTotals: [] };
    }
    const allYears = Array.from(yearMap.entries()).sort(([a], [b]) => a - b);
    const annualTotals = allYears.map(([year, { total }]) => ({ year, total: Math.round(total * 100) / 100 }));

    // Exclude partial boundary years (fewer payments than the ticker's typical cadence) —
    // otherwise a half-year of data at either end skews the growth rate.
    const maxCount = Math.max(...allYears.map(([, v]) => v.count));
    const complete = allYears.filter(([, v]) => v.count >= maxCount).map(([year, { total }]) => ({ year, total }));

    if (complete.length < 2) {
      return { ticker, cagr: null, yearsOfData: complete.length, annualTotals };
    }

    const first = complete[0];
    const last = complete[complete.length - 1];
    const numYears = last.year - first.year;
    const cagr = numYears > 0 && first.total > 0 ? Math.pow(last.total / first.total, 1 / numYears) - 1 : null;
    return { ticker, cagr, yearsOfData: complete.length, annualTotals };
  });
}
