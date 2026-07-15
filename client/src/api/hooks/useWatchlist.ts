import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { WatchlistItem } from '@stockdash/shared';
import { api } from '../client';

export function useWatchlist() {
  return useQuery<WatchlistItem[]>({ queryKey: ['watchlist'], queryFn: () => api.get('/watchlist'), refetchInterval: 60_000 });
}

export function useAddToWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { ticker: string; notes?: string }) => api.post('/watchlist', params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlist'] }),
  });
}

export function useRemoveFromWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/watchlist/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlist'] }),
  });
}
