import { useQuery } from '@tanstack/react-query';
import type { DividendScheduleEntry, DividendSummary } from '@stockdash/shared';
import { api } from '../client';

export function useDividendCalendar() {
  return useQuery<DividendScheduleEntry[]>({ queryKey: ['dividends', 'calendar'], queryFn: () => api.get('/dividends/calendar') });
}

export function useDividendSummary() {
  return useQuery<DividendSummary>({ queryKey: ['dividends', 'summary'], queryFn: () => api.get('/dividends/summary') });
}
