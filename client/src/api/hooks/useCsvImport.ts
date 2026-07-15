import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ImportBatchPreview, CanonicalFieldKey } from '@stockdash/shared';
import { api } from '../client';

export function useUploadCsv() {
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.postForm<ImportBatchPreview>('/csv-imports', form);
    },
  });
}

export function useCommitCsvImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      importBatchId: string;
      mapping: Record<CanonicalFieldKey, string | null>;
      brokerageAccountId: string | null;
      newAccountName: string | null;
      currency: string;
    }) =>
      api.post<{ committed: boolean; errors: string[]; rowsCommitted: number }>(
        `/csv-imports/${params.importBatchId}/commit`,
        {
          mapping: params.mapping,
          brokerageAccountId: params.brokerageAccountId,
          newAccountName: params.newAccountName,
          currency: params.currency,
        },
      ),
    onSuccess: (result) => {
      if (result.committed) {
        qc.invalidateQueries({ queryKey: ['holdings'] });
        qc.invalidateQueries({ queryKey: ['transactions'] });
        qc.invalidateQueries({ queryKey: ['brokerage-accounts'] });
      }
    },
  });
}

export function useCommitSnapshotImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { importBatchId: string; accountNamePrefix: string }) =>
      api.post<{ committed: boolean; errors: string[]; rowsCommitted: number }>(
        `/csv-imports/${params.importBatchId}/commit-snapshot`,
        { accountNamePrefix: params.accountNamePrefix },
      ),
    onSuccess: (result) => {
      if (result.committed) {
        qc.invalidateQueries({ queryKey: ['holdings'] });
        qc.invalidateQueries({ queryKey: ['transactions'] });
        qc.invalidateQueries({ queryKey: ['brokerage-accounts'] });
        qc.invalidateQueries({ queryKey: ['dividends'] });
      }
    },
  });
}

export function useResetPortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/portfolio/reset', { confirm: 'RESET' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holdings'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['brokerage-accounts'] });
    },
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      id: string;
      updates: Partial<{
        ticker: string;
        transactionType: string;
        tradeDate: string;
        quantity: number;
        price: number | null;
        fees: number;
        amount: number;
      }>;
    }) => api.patch(`/transactions/${params.id}`, params.updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['holdings'] });
    },
  });
}
