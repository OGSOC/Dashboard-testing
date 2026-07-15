import { env } from '../../config/env.js';
import type { DividendProvider } from '../types.js';

const BASE_URL = 'https://www.alphavantage.co/query';

interface AlphaVantageDividendResponse {
  data?: {
    ex_dividend_date: string;
    declaration_date: string | null;
    record_date: string | null;
    payment_date: string | null;
    amount: string;
  }[];
}

export const alphaVantageDividendProvider: DividendProvider = {
  name: 'alpha_vantage',
  async getDividendsForTicker(ticker: string) {
    const url = new URL(BASE_URL);
    url.searchParams.set('function', 'DIVIDENDS');
    url.searchParams.set('symbol', ticker.toUpperCase());
    url.searchParams.set('apikey', env.ALPHA_VANTAGE_API_KEY);

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Alpha Vantage request failed (${res.status})`);
    }
    const data = (await res.json()) as AlphaVantageDividendResponse;

    return (data.data ?? [])
      .filter((d) => d.ex_dividend_date && d.amount && d.amount !== 'None')
      .slice(0, 40)
      .map((d) => ({
        ticker: ticker.toUpperCase(),
        exDividendDate: d.ex_dividend_date,
        payDate: d.payment_date && d.payment_date !== 'None' ? d.payment_date : null,
        recordDate: d.record_date && d.record_date !== 'None' ? d.record_date : null,
        declaredDate: d.declaration_date && d.declaration_date !== 'None' ? d.declaration_date : null,
        amount: Number(d.amount),
        currency: 'USD',
        source: 'alpha_vantage',
      }));
  },
};
