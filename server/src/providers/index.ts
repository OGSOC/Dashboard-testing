import { providerConfig } from '../config/env.js';
import { db } from '../db/client.js';
import { providerStatus } from '../db/schema.js';
import { sql } from 'drizzle-orm';
import type {
  QuoteProvider,
  NewsProvider,
  InsiderProvider,
  DividendProvider,
  PoliticalProvider,
  WhaleProvider,
} from './types.js';
import { finnhubQuoteProvider, finnhubNewsProvider, finnhubInsiderProvider } from './finnhub/index.js';
import { alphaVantageDividendProvider } from './alphaVantage/index.js';
import { houseStockWatcherProvider } from './politicalTrading/houseStockWatcher.js';
import { senateStockWatcherProvider } from './politicalTrading/senateStockWatcher.js';
import { secEdgarWhaleProvider } from './secEdgar/index.js';
import {
  seedQuoteProvider,
  seedNewsProvider,
  seedInsiderProvider,
  seedDividendProvider,
  seedWhaleProvider,
} from './seed/index.js';

export const quoteProvider: QuoteProvider = providerConfig.finnhub ? finnhubQuoteProvider : seedQuoteProvider;
export const newsProvider: NewsProvider = providerConfig.finnhub ? finnhubNewsProvider : seedNewsProvider;
export const insiderProvider: InsiderProvider = providerConfig.finnhub ? finnhubInsiderProvider : seedInsiderProvider;
export const dividendProvider: DividendProvider = providerConfig.alphaVantage
  ? alphaVantageDividendProvider
  : seedDividendProvider;
export const whaleProvider: WhaleProvider = providerConfig.secEdgar ? secEdgarWhaleProvider : seedWhaleProvider;

// Political trading has no seed-vs-real branch — House/Senate Stock Watcher
// need no API key, so they're always the "real" attempt; recordProviderRun
// below tracks whether each call actually succeeded.
export const politicalProviders: PoliticalProvider[] = [houseStockWatcherProvider, senateStockWatcherProvider];

export async function recordProviderRun(
  provider: string,
  isConfigured: boolean,
  usingSeedData: boolean,
  error: string | null,
) {
  const now = new Date();
  await db
    .insert(providerStatus)
    .values({
      provider,
      isConfigured,
      usingSeedData,
      lastRunAt: now,
      lastSuccessAt: error ? null : now,
      lastError: error,
    })
    .onConflictDoUpdate({
      target: providerStatus.provider,
      set: {
        isConfigured,
        usingSeedData,
        lastRunAt: now,
        lastSuccessAt: error ? sql`provider_status.last_success_at` : now,
        lastError: error,
      },
    });
}

export async function initProviderStatus() {
  const entries: { provider: string; isConfigured: boolean; usingSeedData: boolean }[] = [
    { provider: 'finnhub', isConfigured: providerConfig.finnhub, usingSeedData: !providerConfig.finnhub },
    { provider: 'alpha_vantage', isConfigured: providerConfig.alphaVantage, usingSeedData: !providerConfig.alphaVantage },
    { provider: 'sec_edgar', isConfigured: providerConfig.secEdgar, usingSeedData: !providerConfig.secEdgar },
    { provider: 'house_stock_watcher', isConfigured: true, usingSeedData: false },
    { provider: 'senate_stock_watcher', isConfigured: true, usingSeedData: false },
  ];

  for (const entry of entries) {
    await db
      .insert(providerStatus)
      .values(entry)
      .onConflictDoUpdate({ target: providerStatus.provider, set: { isConfigured: entry.isConfigured, usingSeedData: entry.usingSeedData } });
  }
}
