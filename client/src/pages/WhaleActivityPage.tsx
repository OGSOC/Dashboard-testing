import { format } from 'date-fns';
import { useWhaleTrades, useMarketContext } from '../api/hooks/useMarketData';
import { EmptyState } from '../components/common/EmptyState';
import { Money } from '../components/common/Badges';
import { ApiKeyMissingBanner } from '../components/common/ApiKeyMissingBanner';
import { TickerContext } from '../components/common/TickerContext';

const ACTION_LABELS: Record<string, string> = {
  new: 'New position',
  increased: 'Increased',
  decreased: 'Decreased',
  closed: 'Closed',
  held: 'Held steady',
};

export function WhaleActivityPage() {
  const { data: trades } = useWhaleTrades();
  const tickers = Array.from(new Set((trades ?? []).map((t) => t.ticker)));
  const { data: context } = useMarketContext(tickers);

  const grouped = new Map<string, typeof trades>();
  for (const t of trades ?? []) {
    if (!grouped.has(t.ticker)) grouped.set(t.ticker, []);
    grouped.get(t.ticker)!.push(t);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Whale Activity</h1>
          <p className="page-subtitle">
            Institutional 13F moves for your tracked tickers, from a curated list of major filers (SEC EDGAR, free). 13F data is
            quarterly with a ~45-day filing lag, so this reflects the most recently disclosed quarter, not real time.
          </p>
        </div>
      </div>

      <ApiKeyMissingBanner providers={['sec_edgar']} />

      {(trades ?? []).length === 0 ? (
        <div className="card">
          <EmptyState title="No whale activity found" body="Add holdings or watchlist tickers to track institutional moves." />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Array.from(grouped.entries()).map(([ticker, rows]) => (
            <div className="card" key={ticker} style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="ticker-chip" style={{ fontSize: 15 }}>{ticker}</span>
              </div>
              <TickerContext context={context?.[ticker]} />
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Filed</th>
                    <th>Institution</th>
                    <th>Quarter</th>
                    <th>Action</th>
                    <th style={{ textAlign: 'right' }}>Shares held</th>
                    <th style={{ textAlign: 'right' }}>Share change</th>
                    <th style={{ textAlign: 'right' }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {rows!.map((t) => (
                    <tr key={t.id}>
                      <td>{format(new Date(t.filedDate), 'MMM d, yyyy')}</td>
                      <td>{t.institutionName}</td>
                      <td>{t.quarter}</td>
                      <td>
                        <span
                          className={`badge ${t.action === 'increased' || t.action === 'new' ? 'badge-buy' : t.action === 'decreased' || t.action === 'closed' ? 'badge-sell' : 'badge-neutral'}`}
                        >
                          {ACTION_LABELS[t.action] ?? t.action}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>{t.shares.toLocaleString()}</td>
                      <td style={{ textAlign: 'right' }}>{t.sharesChange !== null ? t.sharesChange.toLocaleString() : '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <Money value={t.valueUsd} currency="USD" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
