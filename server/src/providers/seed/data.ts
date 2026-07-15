function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}

function daysFromNow(n: number): string {
  return daysAgo(-n);
}

function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

export const seedQuotes: Record<string, { price: number; prevClose: number }> = {
  AAPL: { price: 231.42, prevClose: 228.9 },
  MSFT: { price: 468.11, prevClose: 471.03 },
  NVDA: { price: 142.87, prevClose: 138.5 },
  GOOGL: { price: 192.34, prevClose: 190.1 },
  AMZN: { price: 221.05, prevClose: 219.8 },
  TSLA: { price: 268.9, prevClose: 275.4 },
  JNJ: { price: 156.22, prevClose: 155.9 },
  KO: { price: 71.85, prevClose: 71.5 },
  PG: { price: 168.4, prevClose: 167.9 },
  JPM: { price: 244.6, prevClose: 241.2 },
  XOM: { price: 118.3, prevClose: 117.6 },
  VOO: { price: 561.2, prevClose: 558.9 },
};

export const seedNews = [
  { ticker: 'AAPL', headline: 'Apple unveils next-gen chip lineup for MacBook Pro', source: 'Reuters', daysAgo: 1 },
  { ticker: 'AAPL', headline: 'Apple services revenue hits new quarterly record', source: 'Bloomberg', daysAgo: 4 },
  { ticker: 'MSFT', headline: 'Microsoft expands Azure AI datacenter capacity in Europe', source: 'Reuters', daysAgo: 2 },
  { ticker: 'NVDA', headline: 'Nvidia announces new data-center GPU architecture', source: 'CNBC', daysAgo: 1 },
  { ticker: 'NVDA', headline: 'Analysts raise price targets on Nvidia ahead of earnings', source: 'MarketWatch', daysAgo: 6 },
  { ticker: 'GOOGL', headline: 'Alphabet’s Gemini model adoption accelerates in enterprise', source: 'The Verge', daysAgo: 3 },
  { ticker: 'AMZN', headline: 'Amazon expands same-day delivery to more metro areas', source: 'Reuters', daysAgo: 2 },
  { ticker: 'TSLA', headline: 'Tesla deliveries beat estimates for the quarter', source: 'CNBC', daysAgo: 5 },
  { ticker: 'JNJ', headline: 'Johnson & Johnson raises full-year guidance', source: 'Reuters', daysAgo: 7 },
  { ticker: 'KO', headline: 'Coca-Cola posts steady volume growth in emerging markets', source: 'Bloomberg', daysAgo: 8 },
  { ticker: 'JPM', headline: 'JPMorgan sees resilient consumer spending in latest report', source: 'Reuters', daysAgo: 3 },
  { ticker: 'XOM', headline: 'ExxonMobil increases share buyback program', source: 'MarketWatch', daysAgo: 4 },
].map((n, i) => ({
  ticker: n.ticker,
  headline: n.headline,
  summary: null,
  url: `https://example-news.test/articles/${n.ticker.toLowerCase()}-${i}`,
  source: n.source,
  imageUrl: null,
  publishedAt: daysAgo(n.daysAgo),
  provider: 'seed',
  externalId: `seed-news-${n.ticker}-${i}`,
}));

export const seedInsiderTrades = [
  { ticker: 'AAPL', insiderName: 'Timothy D. Cook', insiderTitle: 'CEO', transactionType: 'sell' as const, shares: 50000, price: 229.5, daysAgo: 10 },
  { ticker: 'MSFT', insiderName: 'Satya Nadella', insiderTitle: 'CEO', transactionType: 'sell' as const, shares: 20000, price: 462.1, daysAgo: 15 },
  { ticker: 'NVDA', insiderName: 'Jensen Huang', insiderTitle: 'CEO', transactionType: 'sell' as const, shares: 120000, price: 135.2, daysAgo: 6 },
  { ticker: 'AMZN', insiderName: 'Andrew Jassy', insiderTitle: 'CEO', transactionType: 'buy' as const, shares: 5000, price: 215.0, daysAgo: 20 },
  { ticker: 'JPM', insiderName: 'Jamie Dimon', insiderTitle: 'Chairman & CEO', transactionType: 'sell' as const, shares: 15000, price: 240.75, daysAgo: 12 },
].map((t, i) => ({
  ticker: t.ticker,
  insiderName: t.insiderName,
  insiderTitle: t.insiderTitle,
  transactionType: t.transactionType,
  transactionDate: dateOnly(daysAgo(t.daysAgo)),
  shares: t.shares,
  price: t.price,
  sharesOwnedAfter: null,
  filingUrl: null,
  provider: 'seed',
  externalId: `seed-insider-${t.ticker}-${i}`,
}));

export const seedPoliticalTrades = [
  { ticker: 'NVDA', politicianName: 'Nancy Pelosi', chamber: 'house' as const, party: 'Democrat', transactionType: 'buy' as const, amountRange: '$1,000,001 - $5,000,000', daysAgo: 25, disclosureLag: 12 },
  { ticker: 'AAPL', politicianName: 'Tommy Tuberville', chamber: 'senate' as const, party: 'Republican', transactionType: 'sell' as const, amountRange: '$50,001 - $100,000', daysAgo: 18, disclosureLag: 20 },
  { ticker: 'MSFT', politicianName: 'Dan Crenshaw', chamber: 'house' as const, party: 'Republican', transactionType: 'buy' as const, amountRange: '$15,001 - $50,000', daysAgo: 30, disclosureLag: 15 },
  { ticker: 'XOM', politicianName: 'Markwayne Mullin', chamber: 'senate' as const, party: 'Republican', transactionType: 'buy' as const, amountRange: '$1,001 - $15,000', daysAgo: 40, disclosureLag: 30 },
  { ticker: 'GOOGL', politicianName: 'Josh Gottheimer', chamber: 'house' as const, party: 'Democrat', transactionType: 'sell' as const, amountRange: '$1,001 - $15,000', daysAgo: 35, disclosureLag: 25 },
].map((t, i) => ({
  ticker: t.ticker,
  politicianName: t.politicianName,
  chamber: t.chamber,
  party: t.party,
  transactionType: t.transactionType,
  transactionDate: dateOnly(daysAgo(t.daysAgo)),
  disclosureDate: dateOnly(daysAgo(t.daysAgo - t.disclosureLag)),
  amountRange: t.amountRange,
  provider: 'seed',
  externalId: `seed-political-${t.ticker}-${i}`,
}));

export const seedWhaleTrades = [
  { ticker: 'AAPL', institutionName: 'Vanguard Group Inc', shares: 1_320_000_000, sharesChange: 12_500_000, action: 'increased' as const },
  { ticker: 'MSFT', institutionName: 'BlackRock Inc', shares: 780_000_000, sharesChange: -3_200_000, action: 'decreased' as const },
  { ticker: 'NVDA', institutionName: 'State Street Corp', shares: 410_000_000, sharesChange: 25_000_000, action: 'increased' as const },
  { ticker: 'AMZN', institutionName: 'Berkshire Hathaway Inc', shares: 9_800_000, sharesChange: 9_800_000, action: 'new' as const },
  { ticker: 'GOOGL', institutionName: 'Fidelity Investments', shares: 95_000_000, sharesChange: -8_000_000, action: 'decreased' as const },
  { ticker: 'JPM', institutionName: 'Vanguard Group Inc', shares: 210_000_000, sharesChange: 0, action: 'held' as const },
].map((t, i) => ({
  ticker: t.ticker,
  institutionName: t.institutionName,
  institutionCik: `000000${1000 + i}`,
  filingType: '13F-HR',
  quarter: 'Q1 2026',
  shares: t.shares,
  sharesChange: t.sharesChange,
  valueUsd: null,
  action: t.action,
  filedDate: dateOnly(daysAgo(45)),
  provider: 'seed',
  externalId: `seed-whale-${t.ticker}-${i}`,
}));

export const seedDividends = [
  { ticker: 'AAPL', amount: 0.26, exDaysAgo: -18, payDaysAgo: -33 },
  { ticker: 'MSFT', amount: 0.83, exDaysAgo: -10, payDaysAgo: -25 },
  { ticker: 'JNJ', amount: 1.24, exDaysAgo: -5, payDaysAgo: -20 },
  { ticker: 'KO', amount: 0.51, exDaysAgo: -2, payDaysAgo: -17 },
  { ticker: 'PG', amount: 1.06, exDaysAgo: -22, payDaysAgo: -37 },
  { ticker: 'JPM', amount: 1.4, exDaysAgo: -15, payDaysAgo: -30 },
  { ticker: 'XOM', amount: 0.99, exDaysAgo: -8, payDaysAgo: -23 },
  { ticker: 'AAPL', amount: 0.26, exDaysAgo: 74, payDaysAgo: 89 },
  { ticker: 'KO', amount: 0.51, exDaysAgo: 89, payDaysAgo: 104 },
].map((d) => ({
  ticker: d.ticker,
  exDividendDate: dateOnly(daysAgo(d.exDaysAgo)),
  payDate: dateOnly(daysAgo(d.payDaysAgo)),
  recordDate: dateOnly(daysAgo(d.exDaysAgo + 2)),
  declaredDate: dateOnly(daysAgo(d.exDaysAgo + 20)),
  amount: d.amount,
  currency: 'USD',
  source: 'seed',
}));

export { daysAgo, daysFromNow, dateOnly };
