import { getAllTrackedTickers } from '../../services/trackedTickers.service.js';
import { refreshWhaleTradesForTicker } from '../../services/whale.service.js';
import { createNotification } from '../../services/notification.service.js';

export async function runWhalePoll(): Promise<void> {
  const byUser = await getAllTrackedTickers();
  const allTickers = new Set<string>();
  for (const tickers of byUser.values()) tickers.forEach((t) => allTickers.add(t));

  const newRowsByTicker = new Map<string, Awaited<ReturnType<typeof refreshWhaleTradesForTicker>>>();
  for (const ticker of allTickers) {
    newRowsByTicker.set(ticker, await refreshWhaleTradesForTicker(ticker));
  }

  for (const [userId, tickers] of byUser) {
    for (const ticker of tickers) {
      const newRows = (newRowsByTicker.get(ticker) ?? []).filter((r) => r.action !== 'held');
      for (const row of newRows) {
        await createNotification({
          userId,
          type: 'whale_trade',
          title: `Whale ${row.action}: ${ticker}`,
          body: `${row.institutionName} ${row.action} its position in ${ticker} to ${Number(row.shares).toLocaleString()} shares (${row.quarter} 13F filing)`,
          ticker,
          relatedEntityType: 'whale_trades',
          relatedEntityId: row.id,
        });
      }
    }
  }
}
