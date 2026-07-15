import { format } from 'date-fns';
import { useInsiderTrades } from '../api/hooks/useMarketData';
import { DataTable } from '../components/common/DataTable';
import { EmptyState } from '../components/common/EmptyState';
import { Money, TransactionTypeBadge } from '../components/common/Badges';
import { ApiKeyMissingBanner } from '../components/common/ApiKeyMissingBanner';

export function InsiderTradingPage() {
  const { data: trades } = useInsiderTrades();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Insider Trading</h1>
          <p className="page-subtitle">Officer & director buys/sells (Form 4) for your tracked tickers</p>
        </div>
      </div>

      <ApiKeyMissingBanner providers={['finnhub']} />

      <div className="card">
        {(trades ?? []).length === 0 ? (
          <EmptyState title="No insider activity found" body="Add holdings or watchlist tickers to track insider trades." />
        ) : (
          <DataTable
            rowKey={(t) => t.id}
            rows={trades ?? []}
            columns={[
              { key: 'date', header: 'Date', render: (t) => format(new Date(t.transactionDate), 'MMM d, yyyy') },
              { key: 'ticker', header: 'Ticker', render: (t) => <span className="ticker-chip">{t.ticker}</span> },
              { key: 'insider', header: 'Insider', render: (t) => <>{t.insiderName}{t.insiderTitle && <div className="text-muted" style={{ fontSize: 12 }}>{t.insiderTitle}</div>}</> },
              { key: 'type', header: 'Type', render: (t) => <TransactionTypeBadge type={t.transactionType} /> },
              { key: 'shares', header: 'Shares', align: 'right', render: (t) => t.shares.toLocaleString() },
              { key: 'price', header: 'Price', align: 'right', render: (t) => <Money value={t.price} /> },
            ]}
          />
        )}
      </div>
    </div>
  );
}
