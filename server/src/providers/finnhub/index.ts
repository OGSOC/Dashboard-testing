import { env } from '../../config/env.js';
import type { QuoteProvider, NewsProvider, InsiderProvider, Quote } from '../types.js';

const BASE_URL = 'https://finnhub.io/api/v1';

async function finnhubFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('token', env.FINNHUB_API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Finnhub request failed (${res.status}): ${path}`);
  }
  return res.json() as Promise<T>;
}

interface FinnhubQuoteResponse {
  c: number; // current price
  pc: number; // previous close
}

export const finnhubQuoteProvider: QuoteProvider = {
  name: 'finnhub',
  async getQuote(ticker: string): Promise<Quote | null> {
    const data = await finnhubFetch<FinnhubQuoteResponse>('/quote', { symbol: ticker.toUpperCase() });
    if (!data.c) return null;
    const changePct = data.pc ? ((data.c - data.pc) / data.pc) * 100 : null;
    return { ticker: ticker.toUpperCase(), lastPrice: data.c, previousClose: data.pc ?? null, changePct, currency: 'USD' };
  },
};

interface FinnhubNewsItem {
  id: number;
  headline: string;
  summary: string;
  url: string;
  source: string;
  image: string;
  datetime: number;
}

export const finnhubNewsProvider: NewsProvider = {
  name: 'finnhub',
  async getNewsForTicker(ticker: string) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 14);
    const data = await finnhubFetch<FinnhubNewsItem[]>('/company-news', {
      symbol: ticker.toUpperCase(),
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    });
    return data.slice(0, 20).map((item) => ({
      ticker: ticker.toUpperCase(),
      headline: item.headline,
      summary: item.summary || null,
      url: item.url,
      source: item.source,
      imageUrl: item.image || null,
      publishedAt: new Date(item.datetime * 1000).toISOString(),
      provider: 'finnhub',
      externalId: String(item.id),
    }));
  },
};

interface FinnhubInsiderTransaction {
  name: string;
  share: number;
  change: number;
  filingDate: string;
  transactionDate: string;
  transactionCode: string;
  transactionPrice: number;
}

function mapInsiderCode(code: string, change: number): 'buy' | 'sell' | 'option_exercise' | 'gift' | 'other' {
  if (code === 'P') return 'buy';
  if (code === 'S') return 'sell';
  if (code === 'M') return 'option_exercise';
  if (code === 'G') return 'gift';
  return change >= 0 ? 'buy' : 'sell';
}

export const finnhubInsiderProvider: InsiderProvider = {
  name: 'finnhub',
  async getInsiderTradesForTicker(ticker: string) {
    const data = await finnhubFetch<{ data: FinnhubInsiderTransaction[] }>('/stock/insider-transactions', {
      symbol: ticker.toUpperCase(),
    });
    return (data.data ?? []).slice(0, 30).map((t, i) => ({
      ticker: ticker.toUpperCase(),
      insiderName: t.name,
      insiderTitle: null,
      transactionType: mapInsiderCode(t.transactionCode, t.change),
      transactionDate: t.transactionDate,
      shares: Math.abs(t.change),
      price: t.transactionPrice || null,
      sharesOwnedAfter: t.share ?? null,
      filingUrl: null,
      provider: 'finnhub',
      externalId: `${ticker.toUpperCase()}-${t.transactionDate}-${t.name}-${i}`,
    }));
  },
};
