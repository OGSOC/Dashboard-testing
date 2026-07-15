import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getTrackedTickersForUser } from '../services/trackedTickers.service.js';
import { getPoliticalTradesForTickers, getAllRecentPoliticalTrades, refreshPoliticalTrades } from '../services/political.service.js';
import { refreshIfStale } from '../services/refreshGate.js';

export const politicalTradesRouter = Router();

const SIX_HOURS = 6 * 60 * 60 * 1000;

politicalTradesRouter.get('/', asyncHandler(async (req, res) => {
  const userId = req.session.userId!;
  await refreshIfStale('political:all', SIX_HOURS, refreshPoliticalTrades);
  const tickers = await getTrackedTickersForUser(userId);
  const tracked = tickers.length > 0 ? await getPoliticalTradesForTickers(tickers) : [];
  res.json(tracked);
}));

politicalTradesRouter.get('/market', asyncHandler(async (_req, res) => {
  await refreshIfStale('political:all', SIX_HOURS, refreshPoliticalTrades);
  res.json(await getAllRecentPoliticalTrades());
}));
