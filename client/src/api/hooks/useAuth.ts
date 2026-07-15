import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthUser } from '@stockdash/shared';
import { api, ApiError } from '../client';

export function useMe() {
  return useQuery<AuthUser>({
    queryKey: ['auth', 'me'],
    queryFn: () => api.get<AuthUser>('/auth/me'),
    retry: false,
    throwOnError: (err) => !(err instanceof ApiError && err.status === 401),
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (creds: { email: string; password: string }) => api.post<AuthUser>('/auth/login', creds),
    onSuccess: (user) => {
      qc.setQueryData(['auth', 'me'], user);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
      qc.setQueryData(['auth', 'me'], null);
      qc.clear();
    },
  });
}
