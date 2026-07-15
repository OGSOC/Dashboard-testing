import { getAllTrackedTickers } from '../../services/trackedTickers.service.js';
import { refreshNewsForTicker } from '../../services/news.service.js';
import { createNotification } from '../../services/notification.service.js';

export async function runNewsPoll(): Promise<void> {
  const byUser = await getAllTrackedTickers();
  const allTickers = new Set<string>();
  for (const tickers of byUser.values()) tickers.forEach((t) => allTickers.add(t));

  const newRowsByTicker = new Map<string, Awaited<ReturnType<typeof refreshNewsForTicker>>>();
  for (const ticker of allTickers) {
    newRowsByTicker.set(ticker, await refreshNewsForTicker(ticker));
  }

  for (const [userId, tickers] of byUser) {
    for (const ticker of tickers) {
      const newRows = newRowsByTicker.get(ticker) ?? [];
      for (const row of newRows.slice(0, 3)) {
        await createNotification({
          userId,
          type: 'news',
          title: `News: ${ticker}`,
          body: row.headline,
          ticker,
          relatedEntityType: 'news_cache',
          relatedEntityId: row.id,
        });
      }
    }
  }
}
