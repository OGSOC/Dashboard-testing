import type { PoliticalProvider } from '../types.js';

// Free, unofficial public dataset — no API key required.
// github.com/timothycarambat/senate-stock-watcher-data
const DATA_URL = 'https://raw.githubusercontent.com/timothycarambat/senate-stock-watcher-data/master/aggregate/all_transactions.json';

interface SenateTransaction {
  transaction_date: string;
  owner: string;
  ticker: string;
  asset_description: string;
  asset_type: string;
  type: string;
  amount: string;
  comment: string;
  senator: string;
  ptr_link?: string;
}

function mapType(raw: string): 'buy' | 'sell' | 'exchange' {
  const t = raw.toLowerCase();
  if (t.includes('purchase')) return 'buy';
  if (t.includes('sale')) return 'sell';
  return 'exchange';
}

function normalizeDate(mmddyyyy: string): string {
  const [mm, dd, yyyy] = mmddyyyy.split('/');
  if (!mm || !dd || !yyyy) return mmddyyyy;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

export const senateStockWatcherProvider: PoliticalProvider = {
  name: 'senate_stock_watcher',
  async getRecentTrades() {
    const res = await fetch(DATA_URL);
    if (!res.ok) {
      throw new Error(`Senate Stock Watcher request failed (${res.status})`);
    }
    const rows = (await res.json()) as SenateTransaction[];

    return rows
      .filter((r) => r.ticker && r.ticker !== '--' && r.asset_type === 'Stock' && r.transaction_date)
      .slice(-500)
      .map((r, i) => ({
        ticker: r.ticker.toUpperCase(),
        politicianName: r.senator,
        chamber: 'senate' as const,
        party: null,
        transactionType: mapType(r.type),
        transactionDate: normalizeDate(r.transaction_date),
        disclosureDate: normalizeDate(r.transaction_date),
        amountRange: r.amount,
        provider: 'senate_stock_watcher',
        externalId: r.ptr_link ? `${r.ptr_link}-${r.ticker}-${i}` : `senate-${r.senator}-${r.ticker}-${r.transaction_date}-${i}`,
      }));
  },
};
