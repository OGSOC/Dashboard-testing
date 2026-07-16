import type {
  QuoteProvider,
  NewsProvider,
  InsiderProvider,
  DividendProvider,
  PoliticalProvider,
  WhaleProvider,
  Quote,
} from '../types.js';
import {
  seedQuotes,
  seedNews,
  seedInsiderTrades,
  seedPoliticalTrades,
  seedWhaleTrades,
  seedDividends,
  seedAnalystConsensus,
} from './data.js';
import type { AnalystConsensus } from '../finnhub/recommendation.js';

export const seedQuoteProvider: QuoteProvider = {
  name: 'seed',
  async getQuote(ticker: string): Promise<Quote | null> {
    const q = seedQuotes[ticker.toUpperCase()];
    if (!q) return null;
    const changePct = ((q.price - q.prevClose) / q.prevClose) * 100;
    return { ticker: ticker.toUpperCase(), lastPrice: q.price, previousClose: q.prevClose, changePct, currency: 'USD' };
  },
};

export const seedNewsProvider: NewsProvider = {
  name: 'seed',
  async getNewsForTicker(ticker: string) {
    return seedNews.filter((n) => n.ticker === ticker.toUpperCase());
  },
};

export const seedInsiderProvider: InsiderProvider = {
  name: 'seed',
  async getInsiderTradesForTicker(ticker: string) {
    return seedInsiderTrades.filter((t) => t.ticker === ticker.toUpperCase());
  },
};

export const seedDividendProvider: DividendProvider = {
  name: 'seed',
  async getDividendsForTicker(ticker: string) {
    return seedDividends.filter((d) => d.ticker === ticker.toUpperCase());
  },
};

export const seedPoliticalProvider: PoliticalProvider = {
  name: 'seed',
  async getRecentTrades() {
    return seedPoliticalTrades;
  },
};

export const seedWhaleProvider: WhaleProvider = {
  name: 'seed',
  async getWhaleTradesForTicker(ticker: string) {
    return seedWhaleTrades.filter((t) => t.ticker === ticker.toUpperCase());
  },
};

export async function getSeedAnalystConsensus(ticker: string): Promise<AnalystConsensus | null> {
  const c = seedAnalystConsensus[ticker.toUpperCase()];
  if (!c) return null;
  return { ticker: ticker.toUpperCase(), period: 'seed', ...c };
}
