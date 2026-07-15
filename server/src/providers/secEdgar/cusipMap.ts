// Static CUSIP lookup for the tickers this app tracks/seeds by default.
// 13F information tables identify holdings by CUSIP, not ticker, so any
// ticker we want whale-tracking for needs an entry here. Extend this map
// (or replace with a fuller SEC/OpenFIGI-backed lookup) to support more
// tickers.
export const TICKER_TO_CUSIP: Record<string, string> = {
  AAPL: '037833100',
  MSFT: '594918104',
  NVDA: '67066G104',
  GOOGL: '02079K305',
  AMZN: '023135106',
  TSLA: '88160R101',
  JNJ: '478160104',
  KO: '191216100',
  PG: '742718109',
  JPM: '46625H100',
  XOM: '30231G102',
  VOO: '922908363',
};

export const CUSIP_TO_TICKER: Record<string, string> = Object.fromEntries(
  Object.entries(TICKER_TO_CUSIP).map(([ticker, cusip]) => [cusip, ticker]),
);

// A curated list of large institutional 13F filers to poll. SEC EDGAR has
// tens of thousands of 13F filers; discovering "every institution holding
// ticker X" would require scanning full-text search results across all of
// them, which isn't practical to do on every poll. Polling this fixed list
// keeps requests bounded while still surfacing the moves that matter most.
export const TRACKED_INSTITUTIONS: { name: string; cik: string }[] = [
  { name: 'Vanguard Group Inc', cik: '0000102909' },
  { name: 'BlackRock Inc', cik: '0001364742' },
  { name: 'State Street Corp', cik: '0000093751' },
  { name: 'Berkshire Hathaway Inc', cik: '0001067983' },
  { name: 'FMR LLC (Fidelity)', cik: '0000315066' },
];
