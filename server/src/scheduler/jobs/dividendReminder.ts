import { and, eq, gte, inArray, lte, desc, lt } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { dividendSchedule, holdings } from '../../db/schema.js';
import { createNotification } from '../../services/notification.service.js';
import { refreshStaleDividends } from '../../services/dividend.service.js';
import { getAllTrackedTickers } from '../../services/trackedTickers.service.js';

async function notifyDividendIncreases(newRowsByTicker: Map<string, (typeof dividendSchedule.$inferSelect)[]>, byUser: Map<string, string[]>) {
  for (const [ticker, newRows] of newRowsByTicker) {
    for (const row of newRows) {
      const [previous] = await db
        .select()
        .from(dividendSchedule)
        .where(and(eq(dividendSchedule.ticker, ticker), lt(dividendSchedule.exDividendDate, row.exDividendDate)))
        .orderBy(desc(dividendSchedule.exDividendDate))
        .limit(1);

      if (!previous || Number(row.amount) <= Number(previous.amount)) continue;
      const increasePct = ((Number(row.amount) - Number(previous.amount)) / Number(previous.amount)) * 100;

      for (const [userId, tickers] of byUser) {
        if (!tickers.includes(ticker)) continue;
        await createNotification({
          userId,
          type: 'dividend_increase',
          title: `Dividend increase: ${ticker}`,
          body: `${ticker} raised its dividend from $${Number(previous.amount).toFixed(4)} to $${Number(row.amount).toFixed(4)} per share (+${increasePct.toFixed(1)}%)`,
          ticker,
          relatedEntityType: 'dividend_schedule',
          relatedEntityId: row.id,
        });
      }
    }
  }
}

export async function runDividendReminder(): Promise<void> {
  const byUser = await getAllTrackedTickers();
  const allTickers = Array.from(new Set(Array.from(byUser.values()).flat()));
  const newRowsByTicker = await refreshStaleDividends(allTickers, 10);
  await notifyDividendIncreases(newRowsByTicker, byUser);

  const today = new Date().toISOString().slice(0, 10);
  const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const userIds = Array.from(byUser.keys());
  for (const userId of userIds) {
    const heldRows = await db.select().from(holdings).where(eq(holdings.userId, userId));
    if (heldRows.length === 0) continue;
    const tickers = heldRows.map((h) => h.ticker);

    const upcoming = await db
      .select()
      .from(dividendSchedule)
      .where(
        and(
          inArray(dividendSchedule.ticker, tickers),
          gte(dividendSchedule.exDividendDate, today),
          lte(dividendSchedule.exDividendDate, in3Days),
        ),
      );

    for (const entry of upcoming) {
      const held = heldRows.find((h) => h.ticker === entry.ticker);
      const estIncome = held ? Number(entry.amount) * Number(held.quantity) : null;
      await createNotification({
        userId,
        type: 'dividend_reminder',
        title: `Upcoming dividend: ${entry.ticker}`,
        body: `${entry.ticker} goes ex-dividend on ${entry.exDividendDate} ($${entry.amount}/share${estIncome ? `, ~$${estIncome.toFixed(2)} for your position` : ''})`,
        ticker: entry.ticker,
        relatedEntityType: 'dividend_schedule',
        relatedEntityId: entry.id,
      });
    }
  }
}
