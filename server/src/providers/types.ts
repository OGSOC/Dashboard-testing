import type {
  NewsItem,
  InsiderTrade,
  DividendScheduleEntry,
  PoliticalTrade,
  WhaleTrade,
} from '@stockdash/shared';

export interface Quote {
  ticker: string;
  lastPrice: number;
  previousClose: number | null;
  changePct: number | null;
  currency: string;
}

export interface QuoteProvider {
  name: string;
  getQuote(ticker: string): Promise<Quote | null>;
}

export interface NewsProvider {
  name: string;
  getNewsForTicker(ticker: string): Promise<Omit<NewsItem, 'id'>[]>;
}

export interface InsiderProvider {
  name: string;
  getInsiderTradesForTicker(ticker: string): Promise<Omit<InsiderTrade, 'id'>[]>;
}

export interface DividendProvider {
  name: string;
  getDividendsForTicker(ticker: string): Promise<Omit<DividendScheduleEntry, 'id'>[]>;
}

export interface PoliticalProvider {
  name: string;
  getRecentTrades(): Promise<Omit<PoliticalTrade, 'id'>[]>;
}

export interface WhaleProvider {
  name: string;
  getWhaleTradesForTicker(ticker: string): Promise<Omit<WhaleTrade, 'id'>[]>;
}
