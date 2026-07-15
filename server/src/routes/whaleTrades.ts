import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getTrackedTickersForUser } from '../services/trackedTickers.service.js';
import { getWhaleTradesForTickers, refreshWhaleTradesForTicker } from '../services/whale.service.js';
import { refreshIfStale } from '../services/refreshGate.js';

export const whaleTradesRouter = Router();

const ONE_DAY = 24 * 60 * 60 * 1000;

whaleTradesRouter.get('/', asyncHandler(async (req, res) => {
  const userId = req.session.userId!;
  const tickers = await getTrackedTickersForUser(userId);
  await Promise.all(tickers.map((t) => refreshIfStale(`whale:${t}`, ONE_DAY, () => refreshWhaleTradesForTicker(t))));
  res.json(await getWhaleTradesForTickers(tickers));
}));

whaleTradesRouter.get('/:ticker', asyncHandler(async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  await refreshIfStale(`whale:${ticker}`, ONE_DAY, () => refreshWhaleTradesForTicker(ticker));
  res.json(await getWhaleTradesForTickers([ticker]));
}));
