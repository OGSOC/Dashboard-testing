import { providerConfig } from '../config/env.js';
import { getAnalystConsensus, type AnalystConsensus } from '../providers/finnhub/recommendation.js';
import { getSeedAnalystConsensus } from '../providers/seed/index.js';
import { recordProviderRun } from '../providers/index.js';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { data: AnalystConsensus | null; fetchedAt: number }>();

export async function getConsensusForTicker(ticker: string): Promise<AnalystConsensus | null> {
  const key = ticker.toUpperCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.data;

  if (!providerConfig.finnhub) {
    const data = await getSeedAnalystConsensus(key);
    cache.set(key, { data, fetchedAt: Date.now() });
    return data;
  }

  try {
    const data = await getAnalystConsensus(key);
    cache.set(key, { data, fetchedAt: Date.now() });
    await recordProviderRun('finnhub', true, false, null);
    return data;
  } catch (err) {
    await recordProviderRun('finnhub', true, false, String(err));
    const data = await getSeedAnalystConsensus(key);
    cache.set(key, { data, fetchedAt: Date.now() });
    return data;
  }
}
