import { useState } from 'react';
import type { CanonicalFieldKey, ImportBatchPreview } from '@stockdash/shared';
import { canonicalFieldKeys } from '@stockdash/shared';
import { useHoldings, useBrokerageAccounts, useTransactions, useDeleteTransaction } from '../api/hooks/usePortfolio';
import { useUploadCsv, useCommitCsvImport } from '../api/hooks/useCsvImport';
import { DataTable } from '../components/common/DataTable';
import { EmptyState } from '../components/common/EmptyState';
import { Money, ChangeBadge, TransactionTypeBadge } from '../components/common/Badges';
import { format } from 'date-fns';

const FIELD_LABELS: Record<CanonicalFieldKey, string> = {
  ticker: 'Ticker',
  tradeDate: 'Trade date',
  transactionType: 'Action',
  quantity: 'Quantity',
  price: 'Price',
  fees: 'Fees',
  amount: 'Amount',
};

function ImportWizard({ onDone }: { onDone: () => void }) {
  const [staged, setStaged] = useState<ImportBatchPreview | null>(null);
  const [mapping, setMapping] = useState<Record<CanonicalFieldKey, string | null> | null>(null);
  const [accountName, setAccountName] = useState('');
  const upload = useUploadCsv();
  const commit = useCommitCsvImport();
  const { data: accounts } = useBrokerageAccounts();
  const [accountId, setAccountId] = useState<string>('');

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    upload.mutate(file, {
      onSuccess: (result) => {
        setStaged(result);
        setMapping(result.suggestedMapping);
      },
    });
  }

  if (commit.data?.committed) {
    return (
      <div className="card">
        <h3>Import complete</h3>
        <p>Committed {commit.data.rowsCommitted} transactions.</p>
        <button className="btn btn-primary" onClick={onDone}>
          Done
        </button>
      </div>
    );
  }

  if (!staged || !mapping) {
    return (
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Import transactions from CSV</h3>
        <p className="text-secondary">Supports Fidelity, Schwab, and Robinhood exports, or any CSV with symbol/date/action/quantity/price columns.</p>
        <input type="file" accept=".csv" onChange={handleFile} disabled={upload.isPending} />
        {upload.isPending && <p className="text-muted">Parsing…</p>}
        {upload.isError && <p style={{ color: 'var(--critical)' }}>{(upload.error as Error).message}</p>}
      </div>
    );
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>
        Review import — detected format: <strong>{staged.detectedFormat}</strong> ({staged.rowCount} rows)
      </h3>

      <div className="section-title">Column mapping</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
        {canonicalFieldKeys.map((field) => (
          <div className="form-field" key={field}>
            <label>{FIELD_LABELS[field]}</label>
            <select
              value={mapping[field] ?? ''}
              onChange={(e) => setMapping({ ...mapping, [field]: e.target.value || null })}
            >
              <option value="">— none —</option>
              {staged.headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="section-title">Brokerage account</div>
      <div className="form-field" style={{ maxWidth: 320 }}>
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">Create new account…</option>
          {(accounts ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.accountName}
            </option>
          ))}
        </select>
        {!accountId && (
          <input placeholder="New account name (e.g. Fidelity Individual)" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
        )}
      </div>

      <div className="section-title">Preview (first {Math.min(5, staged.previewRows.length)} rows)</div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              {staged.headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staged.previewRows.slice(0, 5).map((row, i) => (
              <tr key={i}>
                {staged.headers.map((h) => (
                  <td key={h}>{row[h]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {commit.data && !commit.data.committed && (
        <div className="banner" style={{ background: 'color-mix(in srgb, var(--critical) 14%, var(--surface-1))' }}>
          {commit.data.errors.length} row(s) failed to import: {commit.data.errors.slice(0, 3).join('; ')}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button className="btn" onClick={() => setStaged(null)}>
          Back
        </button>
        <button
          className="btn btn-primary"
          disabled={commit.isPending || (!accountId && !accountName.trim())}
          onClick={() =>
            commit.mutate({
              importBatchId: staged.importBatchId,
              mapping,
              brokerageAccountId: accountId || null,
              newAccountName: accountId ? null : accountName.trim(),
            })
          }
        >
          {commit.isPending ? 'Importing…' : 'Commit import'}
        </button>
      </div>
    </div>
  );
}

export function PortfolioPage() {
  const { data: holdings } = useHoldings();
  const { data: transactions } = useTransactions();
  const deleteTx = useDeleteTransaction();
  const [showImport, setShowImport] = useState(false);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Portfolio</h1>
          <p className="page-subtitle">Holdings and transaction history</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowImport((s) => !s)}>
          {showImport ? 'Close' : '+ Import CSV'}
        </button>
      </div>

      {showImport && (
        <div style={{ marginBottom: 20 }}>
          <ImportWizard onDone={() => setShowImport(false)} />
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Holdings</h3>
        {(holdings ?? []).length === 0 ? (
          <EmptyState title="No holdings yet" body="Import a CSV to see your positions here." />
        ) : (
          <DataTable
            rowKey={(h) => h.id}
            rows={holdings ?? []}
            columns={[
              { key: 'ticker', header: 'Ticker', render: (h) => <span className="ticker-chip">{h.ticker}</span> },
              { key: 'account', header: 'Account', render: (h) => h.brokerageAccountName },
              { key: 'qty', header: 'Qty', align: 'right', render: (h) => h.quantity.toLocaleString() },
              { key: 'avgCost', header: 'Avg cost', align: 'right', render: (h) => <Money value={h.avgCostBasis} /> },
              { key: 'price', header: 'Price', align: 'right', render: (h) => <Money value={h.lastPrice} /> },
              { key: 'change', header: 'Change', align: 'right', render: (h) => <ChangeBadge value={h.changePct} /> },
              { key: 'value', header: 'Market value', align: 'right', render: (h) => <Money value={h.marketValue} /> },
              {
                key: 'gain',
                header: 'Unrealized gain',
                align: 'right',
                render: (h) => (
                  <span className={h.unrealizedGain !== null && h.unrealizedGain >= 0 ? 'delta-up' : 'delta-down'}>
                    <Money value={h.unrealizedGain} /> {h.unrealizedGainPct !== null && `(${h.unrealizedGainPct.toFixed(1)}%)`}
                  </span>
                ),
              },
            ]}
          />
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Transactions</h3>
        {(transactions ?? []).length === 0 ? (
          <EmptyState title="No transactions yet" />
        ) : (
          <DataTable
            rowKey={(t) => t.id}
            rows={transactions ?? []}
            columns={[
              { key: 'date', header: 'Date', render: (t) => format(new Date(t.tradeDate), 'MMM d, yyyy') },
              { key: 'ticker', header: 'Ticker', render: (t) => <span className="ticker-chip">{t.ticker}</span> },
              { key: 'type', header: 'Action', render: (t) => <TransactionTypeBadge type={t.transactionType} /> },
              { key: 'qty', header: 'Qty', align: 'right', render: (t) => (t.quantity ? t.quantity.toLocaleString() : '—') },
              { key: 'price', header: 'Price', align: 'right', render: (t) => <Money value={t.price} /> },
              { key: 'amount', header: 'Amount', align: 'right', render: (t) => <Money value={t.amount} /> },
              {
                key: 'actions',
                header: '',
                render: (t) => (
                  <button className="btn" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => deleteTx.mutate(t.id)}>
                    Delete
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
