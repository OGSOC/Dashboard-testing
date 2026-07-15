import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  integer,
  boolean,
  jsonb,
  date,
  unique,
  index,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const brokerageAccounts = pgTable('brokerage_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  broker: text('broker').notNull(),
  accountName: text('account_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const importBatches = pgTable('import_batches', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  brokerageAccountId: uuid('brokerage_account_id').references(() => brokerageAccounts.id, { onDelete: 'set null' }),
  originalFilename: text('original_filename').notNull(),
  detectedFormat: text('detected_format').notNull(),
  headers: jsonb('headers').$type<string[]>().notNull(),
  rawRows: jsonb('raw_rows').$type<Record<string, string>[]>().notNull(),
  suggestedMapping: jsonb('suggested_mapping').$type<Record<string, string | null>>().notNull(),
  columnMapping: jsonb('column_mapping').$type<Record<string, string | null>>(),
  rowCount: integer('row_count').notNull(),
  status: text('status').$type<'pending_review' | 'committed' | 'failed'>().notNull().default('pending_review'),
  errorLog: jsonb('error_log').$type<string[]>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const transactions = pgTable('transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  brokerageAccountId: uuid('brokerage_account_id').notNull().references(() => brokerageAccounts.id, { onDelete: 'cascade' }),
  importBatchId: uuid('import_batch_id').references(() => importBatches.id, { onDelete: 'set null' }),
  ticker: text('ticker').notNull(),
  transactionType: text('transaction_type').notNull(),
  tradeDate: date('trade_date').notNull(),
  settleDate: date('settle_date'),
  quantity: numeric('quantity', { precision: 18, scale: 6 }).notNull(),
  price: numeric('price', { precision: 18, scale: 6 }),
  fees: numeric('fees', { precision: 18, scale: 6 }).notNull().default('0'),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('USD'),
  rawRow: jsonb('raw_row').$type<Record<string, string>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userTickerIdx: index('transactions_user_ticker_idx').on(t.userId, t.ticker),
}));

export const holdings = pgTable('holdings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  brokerageAccountId: uuid('brokerage_account_id').notNull().references(() => brokerageAccounts.id, { onDelete: 'cascade' }),
  ticker: text('ticker').notNull(),
  quantity: numeric('quantity', { precision: 18, scale: 6 }).notNull(),
  avgCostBasis: numeric('avg_cost_basis', { precision: 18, scale: 6 }).notNull(),
  totalCost: numeric('total_cost', { precision: 18, scale: 2 }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniqueHolding: unique('holdings_user_account_ticker_unique').on(t.userId, t.brokerageAccountId, t.ticker),
}));

export const watchlist = pgTable('watchlist', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  ticker: text('ticker').notNull(),
  notes: text('notes'),
  addedAt: timestamp('added_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniqueWatch: unique('watchlist_user_ticker_unique').on(t.userId, t.ticker),
}));

export const dividendSchedule = pgTable('dividend_schedule', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticker: text('ticker').notNull(),
  exDividendDate: date('ex_dividend_date').notNull(),
  payDate: date('pay_date'),
  recordDate: date('record_date'),
  declaredDate: date('declared_date'),
  amount: numeric('amount', { precision: 10, scale: 4 }).notNull(),
  currency: text('currency').notNull().default('USD'),
  source: text('source').notNull().default('alpha_vantage'),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniqueDividend: unique('dividend_schedule_ticker_exdate_unique').on(t.ticker, t.exDividendDate),
}));

export const newsCache = pgTable('news_cache', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticker: text('ticker').notNull(),
  headline: text('headline').notNull(),
  summary: text('summary'),
  url: text('url').notNull(),
  source: text('source').notNull(),
  imageUrl: text('image_url'),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
  provider: text('provider').notNull().default('finnhub'),
  externalId: text('external_id').notNull(),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniqueNews: unique('news_cache_provider_external_id_unique').on(t.provider, t.externalId),
  tickerIdx: index('news_cache_ticker_idx').on(t.ticker),
}));

export const insiderTrades = pgTable('insider_trades', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticker: text('ticker').notNull(),
  insiderName: text('insider_name').notNull(),
  insiderTitle: text('insider_title'),
  transactionType: text('transaction_type').notNull(),
  transactionDate: date('transaction_date').notNull(),
  shares: numeric('shares', { precision: 20, scale: 2 }).notNull(),
  price: numeric('price', { precision: 18, scale: 6 }),
  sharesOwnedAfter: numeric('shares_owned_after', { precision: 20, scale: 2 }),
  filingUrl: text('filing_url'),
  provider: text('provider').notNull().default('finnhub'),
  externalId: text('external_id').notNull(),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniqueInsider: unique('insider_trades_provider_external_id_unique').on(t.provider, t.externalId),
  tickerIdx: index('insider_trades_ticker_idx').on(t.ticker),
}));

export const politicalTrades = pgTable('political_trades', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticker: text('ticker').notNull(),
  politicianName: text('politician_name').notNull(),
  chamber: text('chamber').notNull(),
  party: text('party'),
  transactionType: text('transaction_type').notNull(),
  transactionDate: date('transaction_date').notNull(),
  disclosureDate: date('disclosure_date').notNull(),
  amountRange: text('amount_range').notNull(),
  provider: text('provider').notNull(),
  externalId: text('external_id').notNull(),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniquePolitical: unique('political_trades_provider_external_id_unique').on(t.provider, t.externalId),
  tickerIdx: index('political_trades_ticker_idx').on(t.ticker),
}));

export const whaleTrades = pgTable('whale_trades', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticker: text('ticker').notNull(),
  institutionName: text('institution_name').notNull(),
  institutionCik: text('institution_cik').notNull(),
  filingType: text('filing_type').notNull().default('13F-HR'),
  quarter: text('quarter').notNull(),
  shares: numeric('shares', { precision: 20, scale: 2 }).notNull(),
  sharesChange: numeric('shares_change', { precision: 20, scale: 2 }),
  valueUsd: numeric('value_usd', { precision: 20, scale: 2 }),
  action: text('action').notNull(),
  filedDate: date('filed_date').notNull(),
  provider: text('provider').notNull().default('sec_edgar'),
  externalId: text('external_id').notNull(),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniqueWhale: unique('whale_trades_provider_external_id_unique').on(t.provider, t.externalId),
  tickerIdx: index('whale_trades_ticker_idx').on(t.ticker),
}));

export const quoteCache = pgTable('quote_cache', {
  ticker: text('ticker').primaryKey(),
  lastPrice: numeric('last_price', { precision: 18, scale: 6 }).notNull(),
  previousClose: numeric('previous_close', { precision: 18, scale: 6 }),
  changePct: numeric('change_pct', { precision: 10, scale: 4 }),
  currency: text('currency').notNull().default('USD'),
  provider: text('provider').notNull().default('finnhub'),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  ticker: text('ticker'),
  relatedEntityType: text('related_entity_type'),
  relatedEntityId: text('related_entity_id'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userReadIdx: index('notifications_user_read_created_idx').on(t.userId, t.isRead, t.createdAt),
  uniqueDedupe: unique('notifications_dedupe_unique').on(t.userId, t.type, t.relatedEntityType, t.relatedEntityId),
}));

export const providerStatus = pgTable('provider_status', {
  provider: text('provider').primaryKey(),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),
  lastError: text('last_error'),
  isConfigured: boolean('is_configured').notNull().default(false),
  usingSeedData: boolean('using_seed_data').notNull().default(true),
});
