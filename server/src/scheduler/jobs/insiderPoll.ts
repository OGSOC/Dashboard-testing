import { getAllTrackedTickers } from '../../services/trackedTickers.service.js';
import { refreshInsiderTradesForTicker } from '../../services/insider.service.js';
import { createNotification } from '../../services/notification.service.js';

export async function runInsiderPoll(): Promise<void> {
  const byUser = await getAllTrackedTickers();
  const allTickers = new Set<string>();
  for (const tickers of byUser.values()) tickers.forEach((t) => allTickers.add(t));

  const newRowsByTicker = new Map<string, Awaited<ReturnType<typeof refreshInsiderTradesForTicker>>>();
  for (const ticker of allTickers) {
    newRowsByTicker.set(ticker, await refreshInsiderTradesForTicker(ticker));
  }

  for (const [userId, tickers] of byUser) {
    for (const ticker of tickers) {
      const newRows = newRowsByTicker.get(ticker) ?? [];
      for (const row of newRows) {
        await createNotification({
          userId,
          type: 'insider_trade',
          title: `Insider ${row.transactionType}: ${ticker}`,
          body: `${row.insiderName} ${row.transactionType === 'sell' ? 'sold' : row.transactionType === 'buy' ? 'bought' : row.transactionType} ${Number(row.shares).toLocaleString()} shares of ${ticker}`,
          ticker,
          relatedEntityType: 'insider_trades',
          relatedEntityId: row.id,
        });
      }
    }
  }
}
