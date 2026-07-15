import { useMutation, useQuery } from '@tanstack/react-query';
import type { DividendScheduleEntry, DividendSummary } from '@stockdash/shared';
import { api } from '../client';

export function useDividendCalendar() {
  return useQuery<DividendScheduleEntry[]>({ queryKey: ['dividends', 'calendar'], queryFn: () => api.get('/dividends/calendar') });
}

export function useDividendSummary() {
  return useQuery<DividendSummary>({ queryKey: ['dividends', 'summary'], queryFn: () => api.get('/dividends/summary') });
}

export interface MonthlyIncomeResponse {
  year: number;
  currency: string;
  months: { month: number; total: number }[];
}

export function useMonthlyIncome(year: number) {
  return useQuery<MonthlyIncomeResponse>({
    queryKey: ['dividends', 'income-by-month', year],
    queryFn: () => api.get(`/dividends/income-by-month?year=${year}`),
  });
}

export interface YearlyIncomeResponse {
  currency: string;
  years: { year: number; total: number }[];
}

export function useYearlyIncome() {
  return useQuery<YearlyIncomeResponse>({ queryKey: ['dividends', 'income-by-year'], queryFn: () => api.get('/dividends/income-by-year') });
}

export interface DividendGrowthEntry {
  ticker: string;
  cagr: number | null;
  yearsOfData: number;
  annualTotals: { year: number; total: number }[];
}

export interface DividendGrowthResponse {
  tickers: DividendGrowthEntry[];
  portfolioWeightedCagr: number | null;
}

export function useDividendGrowth() {
  return useQuery<DividendGrowthResponse>({ queryKey: ['dividends', 'growth'], queryFn: () => api.get('/dividends/growth') });
}

export interface DripProjectionYear {
  year: number;
  portfolioValue: number;
  annualDividendIncome: number;
  cumulativeContributions: number;
  cumulativeDividendsReceived: number;
}

export interface DripProjectionResponse {
  currency: string;
  startingValue: number;
  startingAnnualDividend: number;
  projection: DripProjectionYear[];
}

export function useDripProjection() {
  return useMutation({
    mutationFn: (params: {
      years?: number;
      monthlyContribution?: number;
      priceGrowthRatePct?: number;
      dividendGrowthRatePct?: number;
      reinvestDividends?: boolean;
    }) => api.post<DripProjectionResponse>('/dividends/drip-projection', params),
  });
}
