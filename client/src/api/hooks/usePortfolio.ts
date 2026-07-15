import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Holding, PortfolioSummary, BrokerageAccount, Transaction } from '@stockdash/shared';
import { api } from '../client';

export function useHoldings() {
  return useQuery<Holding[]>({ queryKey: ['holdings'], queryFn: () => api.get('/holdings'), refetchInterval: 60_000 });
}

export function usePortfolioSummary() {
  return useQuery<PortfolioSummary>({
    queryKey: ['holdings', 'summary'],
    queryFn: () => api.get('/holdings/summary'),
    refetchInterval: 60_000,
  });
}

export function useBrokerageAccounts() {
  return useQuery<BrokerageAccount[]>({ queryKey: ['brokerage-accounts'], queryFn: () => api.get('/brokerage-accounts') });
}

export function useTransactions() {
  return useQuery<Transaction[]>({ queryKey: ['transactions'], queryFn: () => api.get('/transactions') });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/transactions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['holdings'] });
    },
  });
}
