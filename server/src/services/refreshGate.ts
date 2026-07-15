// Simple in-memory guard so page loads don't trigger a provider fetch for
// the same ticker+feature more than once per interval. Cron jobs bypass this
// entirely (they call the provider refresh functions directly).
const lastRefreshAt = new Map<string, number>();

export async function refreshIfStale(
  key: string,
  maxAgeMs: number,
  refresh: () => Promise<unknown>,
): Promise<void> {
  const last = lastRefreshAt.get(key) ?? 0;
  if (Date.now() - last < maxAgeMs) return;
  lastRefreshAt.set(key, Date.now());
  try {
    await refresh();
  } catch (err) {
    console.warn(`refreshIfStale failed for ${key}:`, err);
  }
}
