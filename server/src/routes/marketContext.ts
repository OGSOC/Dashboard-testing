import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getNewsForTickers, refreshNewsForTicker } from '../services/news.service.js';
import { getConsensusForTicker } from '../services/analystConsensus.service.js';
import { refreshIfStale } from '../services/refreshGate.js';

export const marketContextRouter = Router();

const ONE_HOUR = 60 * 60 * 1000;

marketContextRouter.get('/', asyncHandler(async (req, res) => {
  const tickersParam = typeof req.query.tickers === 'string' ? req.query.tickers : '';
  const tickers = Array.from(new Set(tickersParam.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean))).slice(0, 30);
  if (tickers.length === 0) {
    res.json({});
    return;
  }

  await Promise.all(tickers.map((t) => refreshIfStale(`news:${t}`, ONE_HOUR, () => refreshNewsForTicker(t))));
  const [allNews, consensusEntries] = await Promise.all([
    getNewsForTickers(tickers, 200),
    Promise.all(tickers.map(async (t) => [t, await getConsensusForTicker(t)] as const)),
  ]);

  const result: Record<string, { news: typeof allNews; consensus: (typeof consensusEntries)[number][1] }> = {};
  for (const ticker of tickers) {
    result[ticker] = {
      news: allNews.filter((n) => n.ticker === ticker).slice(0, 3),
      consensus: consensusEntries.find(([t]) => t === ticker)?.[1] ?? null,
    };
  }
  res.json(result);
}));
