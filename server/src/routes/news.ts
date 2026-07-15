import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getTrackedTickersForUser } from '../services/trackedTickers.service.js';
import { getNewsForTickers, refreshNewsForTicker } from '../services/news.service.js';
import { refreshIfStale } from '../services/refreshGate.js';

export const newsRouter = Router();

const ONE_HOUR = 60 * 60 * 1000;

newsRouter.get('/', asyncHandler(async (req, res) => {
  const userId = req.session.userId!;
  const tickers = await getTrackedTickersForUser(userId);
  await Promise.all(tickers.map((t) => refreshIfStale(`news:${t}`, ONE_HOUR, () => refreshNewsForTicker(t))));
  res.json(await getNewsForTickers(tickers));
}));

newsRouter.get('/:ticker', asyncHandler(async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  await refreshIfStale(`news:${ticker}`, ONE_HOUR, () => refreshNewsForTicker(ticker));
  res.json(await getNewsForTickers([ticker]));
}));
