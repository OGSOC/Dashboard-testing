import { format } from 'date-fns';
import { useWhaleTrades } from '../api/hooks/useMarketData';
import { DataTable } from '../components/common/DataTable';
import { EmptyState } from '../components/common/EmptyState';
import { Money } from '../components/common/Badges';
import { ApiKeyMissingBanner } from '../components/common/ApiKeyMissingBanner';

const ACTION_LABELS: Record<string, string> = {
  new: 'New position',
  increased: 'Increased',
  decreased: 'Decreased',
  closed: 'Closed',
  held: 'Held steady',
};

export function WhaleActivityPage() {
  const { data: trades } = useWhaleTrades();

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

      <div className="card">
        {(trades ?? []).length === 0 ? (
          <EmptyState title="No whale activity found" body="Add holdings or watchlist tickers to track institutional moves." />
        ) : (
          <DataTable
            rowKey={(t) => t.id}
            rows={trades ?? []}
            columns={[
              { key: 'filed', header: 'Filed', render: (t) => format(new Date(t.filedDate), 'MMM d, yyyy') },
              { key: 'ticker', header: 'Ticker', render: (t) => <span className="ticker-chip">{t.ticker}</span> },
              { key: 'institution', header: 'Institution', render: (t) => t.institutionName },
              { key: 'quarter', header: 'Quarter', render: (t) => t.quarter },
              {
                key: 'action',
                header: 'Action',
                render: (t) => (
                  <span className={`badge ${t.action === 'increased' || t.action === 'new' ? 'badge-buy' : t.action === 'decreased' || t.action === 'closed' ? 'badge-sell' : 'badge-neutral'}`}>
                    {ACTION_LABELS[t.action] ?? t.action}
                  </span>
                ),
              },
              { key: 'shares', header: 'Shares held', align: 'right', render: (t) => t.shares.toLocaleString() },
              {
                key: 'change',
                header: 'Share change',
                align: 'right',
                render: (t) => (t.sharesChange !== null ? t.sharesChange.toLocaleString() : '—'),
              },
              { key: 'value', header: 'Value', align: 'right', render: (t) => <Money value={t.valueUsd} /> },
            ]}
          />
        )}
      </div>
    </div>
  );
}
