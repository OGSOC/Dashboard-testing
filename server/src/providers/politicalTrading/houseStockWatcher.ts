import type { PoliticalProvider } from '../types.js';

// Free, unofficial public dataset — no API key required. Community-maintained
// (github.com/timothycarambat/house-stock-watcher-data); if it's ever
// unreachable, this provider just returns no rows and the scheduler falls
// back to seed data for the House chamber, same as any other provider outage.
const DATA_URL = 'https://house-stock-watcher-data.s3-us-west-2.amazonaws.com/data/all_transactions.json';

interface HouseTransaction {
  disclosure_year: string;
  disclosure_date: string;
  transaction_date: string;
  owner: string;
  ticker: string;
  asset_description: string;
  type: string;
  amount: string;
  representative: string;
  district: string;
  party?: string;
  ptr_link?: string;
}

function mapType(raw: string): 'buy' | 'sell' | 'exchange' {
  const t = raw.toLowerCase();
  if (t.includes('purchase')) return 'buy';
  if (t.includes('sale')) return 'sell';
  return 'exchange';
}

export const houseStockWatcherProvider: PoliticalProvider = {
  name: 'house_stock_watcher',
  async getRecentTrades() {
    const res = await fetch(DATA_URL);
    if (!res.ok) {
      throw new Error(`House Stock Watcher request failed (${res.status})`);
    }
    const rows = (await res.json()) as HouseTransaction[];

    return rows
      .filter((r) => r.ticker && r.ticker !== '--' && r.transaction_date)
      .slice(-500)
      .map((r, i) => ({
        ticker: r.ticker.toUpperCase(),
        politicianName: r.representative,
        chamber: 'house' as const,
        party: r.party ?? null,
        transactionType: mapType(r.type),
        transactionDate: r.transaction_date,
        disclosureDate: r.disclosure_date || r.transaction_date,
        amountRange: r.amount,
        provider: 'house_stock_watcher',
        externalId: r.ptr_link ? `${r.ptr_link}-${r.ticker}-${i}` : `house-${r.representative}-${r.ticker}-${r.transaction_date}-${i}`,
      }));
  },
};
