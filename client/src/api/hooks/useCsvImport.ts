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
    }) =>
      api.post<{ committed: boolean; errors: string[]; rowsCommitted: number }>(
        `/csv-imports/${params.importBatchId}/commit`,
        {
          mapping: params.mapping,
          brokerageAccountId: params.brokerageAccountId,
          newAccountName: params.newAccountName,
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
