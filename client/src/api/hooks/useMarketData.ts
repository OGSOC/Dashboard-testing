import { useQuery } from '@tanstack/react-query';
import type { NewsItem, InsiderTrade, PoliticalTrade, WhaleTrade, ProviderStatusEntry, MarketContextResponse } from '@stockdash/shared';
import { api } from '../client';

export function useNews() {
  return useQuery<NewsItem[]>({ queryKey: ['news'], queryFn: () => api.get('/news') });
}

export function useInsiderTrades() {
  return useQuery<InsiderTrade[]>({ queryKey: ['insider-trades'], queryFn: () => api.get('/insider-trades') });
}

export function usePoliticalTrades() {
  return useQuery<PoliticalTrade[]>({ queryKey: ['political-trades'], queryFn: () => api.get('/political-trades') });
}

export function usePoliticalTradesMarket() {
  return useQuery<PoliticalTrade[]>({ queryKey: ['political-trades', 'market'], queryFn: () => api.get('/political-trades/market') });
}

export function useWhaleTrades() {
  return useQuery<WhaleTrade[]>({ queryKey: ['whale-trades'], queryFn: () => api.get('/whale-trades') });
}

export function useProviderStatus() {
  return useQuery<ProviderStatusEntry[]>({ queryKey: ['providers', 'status'], queryFn: () => api.get('/providers/status'), refetchInterval: 60_000 });
}

export function useMarketContext(tickers: string[]) {
  const key = Array.from(new Set(tickers)).sort().join(',');
  return useQuery<MarketContextResponse>({
    queryKey: ['market-context', key],
    queryFn: () => api.get(`/market-context?tickers=${encodeURIComponent(key)}`),
    enabled: tickers.length > 0,
  });
}
