import { format } from 'date-fns';
import { useInsiderTrades, useMarketContext } from '../api/hooks/useMarketData';
import { EmptyState } from '../components/common/EmptyState';
import { Money, TransactionTypeBadge } from '../components/common/Badges';
import { ApiKeyMissingBanner } from '../components/common/ApiKeyMissingBanner';
import { TickerContext } from '../components/common/TickerContext';

export function InsiderTradingPage() {
  const { data: trades } = useInsiderTrades();
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
          <h1 className="page-title">Insider Trading</h1>
          <p className="page-subtitle">Officer & director buys/sells (Form 4) for your tracked tickers</p>
        </div>
      </div>

      <ApiKeyMissingBanner providers={['finnhub']} />

      {(trades ?? []).length === 0 ? (
        <div className="card">
          <EmptyState title="No insider activity found" body="Add holdings or watchlist tickers to track insider trades." />
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
                    <th>Date</th>
                    <th>Insider</th>
                    <th>Type</th>
                    <th style={{ textAlign: 'right' }}>Shares</th>
                    <th style={{ textAlign: 'right' }}>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {rows!.map((t) => (
                    <tr key={t.id}>
                      <td>{format(new Date(t.transactionDate), 'MMM d, yyyy')}</td>
                      <td>
                        {t.insiderName}
                        {t.insiderTitle && <div className="text-muted" style={{ fontSize: 12 }}>{t.insiderTitle}</div>}
                      </td>
                      <td>
                        <TransactionTypeBadge type={t.transactionType} />
                      </td>
                      <td style={{ textAlign: 'right' }}>{t.shares.toLocaleString()}</td>
                      <td style={{ textAlign: 'right' }}>
                        <Money value={t.price} currency="USD" />
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
