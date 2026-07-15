import { format } from 'date-fns';
import { useDividendCalendar, useDividendSummary } from '../api/hooks/useDividends';
import { StatTile } from '../components/common/StatTile';
import { DataTable } from '../components/common/DataTable';
import { EmptyState } from '../components/common/EmptyState';
import { Money } from '../components/common/Badges';
import { ApiKeyMissingBanner } from '../components/common/ApiKeyMissingBanner';

export function DividendsPage() {
  const { data: calendar } = useDividendCalendar();
  const { data: summary } = useDividendSummary();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dividends</h1>
          <p className="page-subtitle">Income received, projected, and yield on cost</p>
        </div>
      </div>

      <ApiKeyMissingBanner providers={['alpha_vantage']} />

      <div className="stat-grid">
        <StatTile label="Received YTD" value={summary ? <Money value={summary.totalReceivedYtd} /> : '—'} />
        <StatTile label="Received (trailing 12mo)" value={summary ? <Money value={summary.totalReceivedTrailing12m} /> : '—'} />
        <StatTile label="Projected (next 12mo)" value={summary ? <Money value={summary.projectedNext12m} /> : '—'} />
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Yield on cost by holding</h3>
        {(summary?.yieldOnCostByTicker ?? []).length === 0 ? (
          <EmptyState title="No dividend-paying holdings yet" />
        ) : (
          <DataTable
            rowKey={(r) => r.ticker}
            rows={summary!.yieldOnCostByTicker}
            columns={[
              { key: 'ticker', header: 'Ticker', render: (r) => <span className="ticker-chip">{r.ticker}</span> },
              { key: 'income', header: 'Est. annual income', align: 'right', render: (r) => <Money value={r.annualIncome} /> },
              { key: 'yield', header: 'Yield on cost', align: 'right', render: (r) => `${r.yieldOnCost.toFixed(2)}%` },
            ]}
          />
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Dividend calendar</h3>
        {(calendar ?? []).length === 0 ? (
          <EmptyState title="Nothing scheduled" body="Add holdings or watchlist tickers to see upcoming dividends." />
        ) : (
          <DataTable
            rowKey={(d) => d.id}
            rows={calendar ?? []}
            columns={[
              { key: 'ticker', header: 'Ticker', render: (d) => <span className="ticker-chip">{d.ticker}</span> },
              { key: 'ex', header: 'Ex-dividend date', render: (d) => format(new Date(d.exDividendDate), 'MMM d, yyyy') },
              { key: 'pay', header: 'Pay date', render: (d) => (d.payDate ? format(new Date(d.payDate), 'MMM d, yyyy') : '—') },
              { key: 'amount', header: 'Amount/share', align: 'right', render: (d) => <Money value={Number(d.amount)} /> },
            ]}
          />
        )}
      </div>
    </div>
  );
}
