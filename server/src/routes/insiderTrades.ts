import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getTrackedTickersForUser } from '../services/trackedTickers.service.js';
import { getInsiderTradesForTickers, refreshInsiderTradesForTicker } from '../services/insider.service.js';
import { refreshIfStale } from '../services/refreshGate.js';

export const insiderTradesRouter = Router();

const SIX_HOURS = 6 * 60 * 60 * 1000;

insiderTradesRouter.get('/', asyncHandler(async (req, res) => {
  const userId = req.session.userId!;
  const tickers = await getTrackedTickersForUser(userId);
  await Promise.all(tickers.map((t) => refreshIfStale(`insider:${t}`, SIX_HOURS, () => refreshInsiderTradesForTicker(t))));
  res.json(await getInsiderTradesForTickers(tickers));
}));

insiderTradesRouter.get('/:ticker', asyncHandler(async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  await refreshIfStale(`insider:${ticker}`, SIX_HOURS, () => refreshInsiderTradesForTicker(ticker));
  res.json(await getInsiderTradesForTickers([ticker]));
}));
