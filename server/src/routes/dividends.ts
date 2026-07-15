import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getTrackedTickersForUser } from '../services/trackedTickers.service.js';
import { getDividendCalendar, getDividendHistory, getDividendSummary, refreshStaleDividends } from '../services/dividend.service.js';

export const dividendsRouter = Router();

dividendsRouter.get('/calendar', asyncHandler(async (req, res) => {
  const userId = req.session.userId!;
  const tickers = await getTrackedTickersForUser(userId);
  await refreshStaleDividends(tickers, 5);
  res.json(await getDividendCalendar(tickers));
}));

dividendsRouter.get('/summary', asyncHandler(async (req, res) => {
  const userId = req.session.userId!;
  res.json(await getDividendSummary(userId));
}));

dividendsRouter.get('/:ticker/history', asyncHandler(async (req, res) => {
  res.json(await getDividendHistory(req.params.ticker.toUpperCase()));
}));
