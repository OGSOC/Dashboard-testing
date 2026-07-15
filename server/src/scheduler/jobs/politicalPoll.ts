import { getAllTrackedTickers } from '../../services/trackedTickers.service.js';
import { refreshPoliticalTrades } from '../../services/political.service.js';
import { createNotification } from '../../services/notification.service.js';

export async function runPoliticalPoll(): Promise<void> {
  const newRows = await refreshPoliticalTrades();
  if (newRows.length === 0) return;

  const byUser = await getAllTrackedTickers();
  const newRowsByTicker = new Map<string, typeof newRows>();
  for (const row of newRows) {
    if (!newRowsByTicker.has(row.ticker)) newRowsByTicker.set(row.ticker, []);
    newRowsByTicker.get(row.ticker)!.push(row);
  }

  for (const [userId, tickers] of byUser) {
    for (const ticker of tickers) {
      const rows = newRowsByTicker.get(ticker) ?? [];
      for (const row of rows) {
        await createNotification({
          userId,
          type: 'political_trade',
          title: `Congress ${row.transactionType}: ${ticker}`,
          body: `${row.politicianName} (${row.chamber === 'house' ? 'House' : 'Senate'}) reported a ${row.transactionType} of ${ticker} (${row.amountRange})`,
          ticker,
          relatedEntityType: 'political_trades',
          relatedEntityId: row.id,
        });
      }
    }
  }
}
