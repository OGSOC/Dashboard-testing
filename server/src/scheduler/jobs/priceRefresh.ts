import { getAllTrackedTickers } from '../../services/trackedTickers.service.js';
import { getQuotesForTickers } from '../../services/quote.service.js';

export async function runPriceRefresh(): Promise<void> {
  const byUser = await getAllTrackedTickers();
  const allTickers = Array.from(new Set(Array.from(byUser.values()).flat()));
  if (allTickers.length === 0) return;
  await getQuotesForTickers(allTickers);
}
