import { useState } from 'react';
import type { FormEvent } from 'react';
import { useWatchlist, useAddToWatchlist, useRemoveFromWatchlist } from '../api/hooks/useWatchlist';
import { DataTable } from '../components/common/DataTable';
import { EmptyState } from '../components/common/EmptyState';
import { Money, ChangeBadge } from '../components/common/Badges';

export function WatchlistPage() {
  const { data: watchlist } = useWatchlist();
  const add = useAddToWatchlist();
  const remove = useRemoveFromWatchlist();
  const [ticker, setTicker] = useState('');

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!ticker.trim()) return;
    add.mutate({ ticker: ticker.trim().toUpperCase() }, { onSuccess: () => setTicker('') });
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Watchlist</h1>
          <p className="page-subtitle">Track tickers you don't hold — news, insider, whale, and political activity still follow these.</p>
        </div>
      </div>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          placeholder="Add ticker (e.g. META)"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)' }}
        />
        <button className="btn btn-primary" type="submit" disabled={add.isPending}>
          Add
        </button>
      </form>

      <div className="card">
        {(watchlist ?? []).length === 0 ? (
          <EmptyState title="Your watchlist is empty" body="Add a ticker above to start tracking it." />
        ) : (
          <DataTable
            rowKey={(w) => w.id}
            rows={watchlist ?? []}
            columns={[
              { key: 'ticker', header: 'Ticker', render: (w) => <span className="ticker-chip">{w.ticker}</span> },
              { key: 'price', header: 'Price', align: 'right', render: (w) => <Money value={w.lastPrice} /> },
              { key: 'change', header: 'Change', align: 'right', render: (w) => <ChangeBadge value={w.changePct} /> },
              {
                key: 'actions',
                header: '',
                render: (w) => (
                  <button className="btn" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => remove.mutate(w.id)}>
                    Remove
                  </button>
                ),
              },
            ]}
          />
        )}
      </div>
    </div>
  );
}
