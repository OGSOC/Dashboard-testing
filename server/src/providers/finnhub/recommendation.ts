import { env } from '../../config/env.js';

const BASE_URL = 'https://finnhub.io/api/v1';

export interface AnalystConsensus {
  ticker: string;
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

interface FinnhubRecommendationTrend {
  symbol: string;
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

export async function getAnalystConsensus(ticker: string): Promise<AnalystConsensus | null> {
  const url = new URL(`${BASE_URL}/stock/recommendation`);
  url.searchParams.set('symbol', ticker.toUpperCase());
  url.searchParams.set('token', env.FINNHUB_API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Finnhub recommendation request failed (${res.status})`);
  }
  const data = (await res.json()) as FinnhubRecommendationTrend[];
  const latest = data[0];
  if (!latest) return null;
  return {
    ticker: ticker.toUpperCase(),
    period: latest.period,
    strongBuy: latest.strongBuy,
    buy: latest.buy,
    hold: latest.hold,
    sell: latest.sell,
    strongSell: latest.strongSell,
  };
}
