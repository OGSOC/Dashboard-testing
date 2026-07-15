export type TransactionType =
  | 'buy'
  | 'sell'
  | 'dividend'
  | 'split'
  | 'transfer_in'
  | 'transfer_out'
  | 'fee'
  | 'interest';

export interface Transaction {
  id: string;
  brokerageAccountId: string;
  ticker: string;
  transactionType: TransactionType;
  tradeDate: string;
  settleDate: string | null;
  quantity: number;
  price: number | null;
  fees: number;
  amount: number;
  currency: string;
  createdAt: string;
}

export interface Holding {
  id: string;
  brokerageAccountId: string;
  brokerageAccountName: string;
  ticker: string;
  quantity: number;
  currency: string;
  avgCostBasis: number;
  totalCost: number;
  lastPrice: number | null;
  changePct: number | null;
  marketValue: number | null;
  unrealizedGain: number | null;
  unrealizedGainPct: number | null;
}

export interface PortfolioSummary {
  currency: string;
  totalMarketValue: number;
  totalCost: number;
  totalUnrealizedGain: number;
  totalUnrealizedGainPct: number;
  dayChangeValue: number;
  dayChangePct: number;
  holdingCount: number;
}

export interface BrokerageAccount {
  id: string;
  broker: string;
  accountName: string;
  currency: string;
  createdAt: string;
}

export type ImportBatchStatus = 'pending_review' | 'committed' | 'failed';

export interface ImportBatchPreview {
  importBatchId: string;
  detectedFormat: string;
  headers: string[];
  suggestedMapping: Record<string, string | null>;
  previewRows: Record<string, string>[];
  rowCount: number;
}

export interface WatchlistItem {
  id: string;
  ticker: string;
  notes: string | null;
  addedAt: string;
  lastPrice: number | null;
  changePct: number | null;
}

export interface DividendScheduleEntry {
  id: string;
  ticker: string;
  exDividendDate: string;
  payDate: string | null;
  recordDate: string | null;
  declaredDate: string | null;
  amount: number;
  currency: string;
  source: string;
}

export interface DividendIncomeEntry {
  ticker: string;
  date: string;
  amount: number;
}

export interface DividendSummary {
  totalReceivedYtd: number;
  totalReceivedTrailing12m: number;
  projectedNext12m: number;
  yieldOnCostByTicker: { ticker: string; yieldOnCost: number; annualIncome: number }[];
}

export interface NewsItem {
  id: string;
  ticker: string;
  headline: string;
  summary: string | null;
  url: string;
  source: string;
  imageUrl: string | null;
  publishedAt: string;
  provider: string;
  externalId: string;
}

export type InsiderTransactionType = 'buy' | 'sell' | 'option_exercise' | 'gift' | 'other';

export interface InsiderTrade {
  id: string;
  ticker: string;
  insiderName: string;
  insiderTitle: string | null;
  transactionType: InsiderTransactionType;
  transactionDate: string;
  shares: number;
  price: number | null;
  sharesOwnedAfter: number | null;
  filingUrl: string | null;
  provider: string;
  externalId: string;
}

export type PoliticalChamber = 'house' | 'senate';
export type PoliticalTransactionType = 'buy' | 'sell' | 'exchange';

export interface PoliticalTrade {
  id: string;
  ticker: string;
  politicianName: string;
  chamber: PoliticalChamber;
  party: string | null;
  transactionType: PoliticalTransactionType;
  transactionDate: string;
  disclosureDate: string;
  amountRange: string;
  provider: string;
  externalId: string;
}

export type WhaleAction = 'new' | 'increased' | 'decreased' | 'closed' | 'held';

export interface WhaleTrade {
  id: string;
  ticker: string;
  institutionName: string;
  institutionCik: string;
  filingType: string;
  quarter: string;
  shares: number;
  sharesChange: number | null;
  valueUsd: number | null;
  action: WhaleAction;
  filedDate: string;
  provider: string;
  externalId: string;
}

export type NotificationType =
  | 'insider_trade'
  | 'political_trade'
  | 'whale_trade'
  | 'dividend_reminder'
  | 'dividend_increase'
  | 'news'
  | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  ticker: string | null;
  isRead: boolean;
  createdAt: string;
}

export type ProviderName = 'finnhub' | 'alpha_vantage' | 'house_stock_watcher' | 'senate_stock_watcher' | 'sec_edgar' | 'seed';

export interface ProviderStatusEntry {
  provider: ProviderName;
  isConfigured: boolean;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  usingSeedData: boolean;
}

export interface AnalystConsensus {
  ticker: string;
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

export interface MarketContextEntry {
  news: NewsItem[];
  consensus: AnalystConsensus | null;
}

export type MarketContextResponse = Record<string, MarketContextEntry>;

export type SupportedCurrency = 'USD' | 'GBP' | 'EUR';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  displayCurrency: SupportedCurrency;
}
