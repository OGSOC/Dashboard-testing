import { useState } from 'react';
import { format } from 'date-fns';
import { usePoliticalTrades, usePoliticalTradesMarket } from '../api/hooks/useMarketData';
import { DataTable } from '../components/common/DataTable';
import { EmptyState } from '../components/common/EmptyState';
import { TransactionTypeBadge } from '../components/common/Badges';

export function PoliticalTradingPage() {
  const [view, setView] = useState<'tracked' | 'market'>('tracked');
  const { data: tracked } = usePoliticalTrades();
  const { data: market } = usePoliticalTradesMarket();
  const rows = view === 'tracked' ? tracked : market;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Political Trading</h1>
          <p className="page-subtitle">Congressional stock disclosures (House Stock Watcher & Senate Stock Watcher — free, no API key)</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn${view === 'tracked' ? ' btn-primary' : ''}`} onClick={() => setView('tracked')}>
            Your tickers
          </button>
          <button className={`btn${view === 'market' ? ' btn-primary' : ''}`} onClick={() => setView('market')}>
            Market-wide
          </button>
        </div>
      </div>

      <div className="card">
        {(rows ?? []).length === 0 ? (
          <EmptyState title="No political trades found" body={view === 'tracked' ? 'Add holdings or watchlist tickers to see relevant trades.' : undefined} />
        ) : (
          <DataTable
            rowKey={(t) => t.id}
            rows={rows ?? []}
            columns={[
              { key: 'date', header: 'Transaction date', render: (t) => format(new Date(t.transactionDate), 'MMM d, yyyy') },
              { key: 'ticker', header: 'Ticker', render: (t) => <span className="ticker-chip">{t.ticker}</span> },
              { key: 'politician', header: 'Politician', render: (t) => <>{t.politicianName}<div className="text-muted" style={{ fontSize: 12 }}>{t.chamber === 'house' ? 'House' : 'Senate'}{t.party ? ` · ${t.party}` : ''}</div></> },
              { key: 'type', header: 'Type', render: (t) => <TransactionTypeBadge type={t.transactionType} /> },
              { key: 'amount', header: 'Amount range', align: 'right', render: (t) => t.amountRange },
              { key: 'disclosed', header: 'Disclosed', render: (t) => format(new Date(t.disclosureDate), 'MMM d, yyyy') },
            ]}
          />
        )}
      </div>
    </div>
  );
}
