import { db } from '../db/client.js';
import { fxRateCache } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export const SUPPORTED_CURRENCIES = ['USD', 'GBP', 'EUR'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

// Used only if Frankfurter is unreachable, so currency switching never hard-fails.
// Approximate — refreshed automatically from live rates whenever the network allows.
const FALLBACK_RATES_FROM_USD: Record<SupportedCurrency, number> = {
  USD: 1,
  GBP: 0.79,
  EUR: 0.92,
};

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

async function fetchLiveRates(): Promise<Record<string, number> | null> {
  try {
    const res = await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=GBP,EUR');
    if (!res.ok) return null;
    const data = (await res.json()) as { rates: Record<string, number> };
    return data.rates;
  } catch {
    return null;
  }
}

/** Returns { GBP: 0.79, EUR: 0.92, USD: 1 } — units of `currency` per 1 USD. */
export async function getRatesFromUsd(): Promise<Record<SupportedCurrency, number>> {
  const cached = await db.select().from(fxRateCache);
  const cachedByCode = new Map(cached.map((c) => [c.currency, c]));
  const now = Date.now();

  const stale =
    SUPPORTED_CURRENCIES.filter((c) => c !== 'USD').some((c) => {
      const row = cachedByCode.get(c);
      return !row || now - new Date(row.fetchedAt).getTime() > CACHE_TTL_MS;
    });

  if (stale) {
    const live = await fetchLiveRates();
    if (live) {
      for (const code of Object.keys(live)) {
        if (!SUPPORTED_CURRENCIES.includes(code as SupportedCurrency)) continue;
        await db
          .insert(fxRateCache)
          .values({ currency: code, rateFromUsd: String(live[code]) })
          .onConflictDoUpdate({ target: fxRateCache.currency, set: { rateFromUsd: String(live[code]), fetchedAt: new Date() } });
        cachedByCode.set(code, { currency: code, rateFromUsd: String(live[code]), fetchedAt: new Date() });
      }
    }
  }

  const result = {} as Record<SupportedCurrency, number>;
  for (const code of SUPPORTED_CURRENCIES) {
    if (code === 'USD') {
      result[code] = 1;
      continue;
    }
    const row = cachedByCode.get(code);
    result[code] = row ? Number(row.rateFromUsd) : FALLBACK_RATES_FROM_USD[code];
  }
  return result;
}

export async function getRateFromUsd(currency: SupportedCurrency): Promise<number> {
  if (currency === 'USD') return 1;
  const rates = await getRatesFromUsd();
  return rates[currency];
}

export function convertFromUsd(amountUsd: number | null, rate: number): number | null {
  if (amountUsd === null) return null;
  return amountUsd * rate;
}

function normalizeCurrency(code: string): SupportedCurrency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(code) ? (code as SupportedCurrency) : 'USD';
}

/** Cross-rate conversion between any two supported currencies, routed through USD. */
export async function getCrossRate(from: string, to: string): Promise<number> {
  const fromCode = normalizeCurrency(from);
  const toCode = normalizeCurrency(to);
  if (fromCode === toCode) return 1;
  const rates = await getRatesFromUsd();
  // rates[x] = units of x per 1 USD, so USD->to is rates[to] and from->USD is 1/rates[from]
  return rates[toCode] / rates[fromCode];
}
