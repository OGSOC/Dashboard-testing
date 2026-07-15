import { useState } from 'react';
import type { CanonicalFieldKey, ImportBatchPreview, Transaction } from '@stockdash/shared';
import { canonicalFieldKeys } from '@stockdash/shared';
import { useHoldings, useBrokerageAccounts, useTransactions, useDeleteTransaction } from '../api/hooks/usePortfolio';
import {
  useUploadCsv,
  useCommitCsvImport,
  useCommitSnapshotImport,
  useCommitSnowballTransactions,
  useResetPortfolio,
  useUpdateTransaction,
} from '../api/hooks/useCsvImport';
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

const CURRENCIES = ['GBP', 'USD', 'EUR'];
const REQUIRED_FIELDS: CanonicalFieldKey[] = ['ticker', 'tradeDate', 'transactionType'];

function SnapshotConfirm({ staged, onDone, onBack }: { staged: ImportBatchPreview; onDone: () => void; onBack: () => void }) {
  const [accountNamePrefix, setAccountNamePrefix] = useState('Snowball Import');
  const commit = useCommitSnapshotImport();

  if (commit.data?.committed) {
    return (
      <div className="card">
        <h3>Import complete</h3>
        <p>Imported {commit.data.rowsCommitted} holdings as opening positions dated today.</p>
        <button className="btn btn-primary" onClick={onDone}>
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>
        Review import — detected format: <strong>Snowball Analytics holdings snapshot</strong> ({staged.snapshotSummary?.tickerCount ?? staged.rowCount}{' '}
        positions)
      </h3>
      <p className="text-secondary" style={{ fontSize: 13 }}>
        This is a point-in-time snapshot of your holdings (shares, average cost, current dividend info) — not a dated transaction
        history, since Snowball's holdings export doesn't include one. No column mapping is needed: each row becomes a single
        opening position dated <strong>today</strong>, using Snowball's own cost-basis figures, so your holdings and yield-on-cost
        match what Snowball shows. Upcoming ex-dividend and pay dates from the file are added to your dividend calendar too.
      </p>
      {staged.snapshotSummary && staged.snapshotSummary.currencies.length > 0 && (
        <p className="text-secondary" style={{ fontSize: 13 }}>
          Currencies detected: <strong>{staged.snapshotSummary.currencies.join(', ')}</strong> — a separate account is created per
          currency, since cost-basis totals can't mix currencies.
        </p>
      )}
      <div className="banner">
        If you've imported this file before, re-importing will add a duplicate opening position for every holding. Use{' '}
        <strong>Reset portfolio</strong> first if you want to replace rather than add to what's already there.
      </div>

      <div className="form-field" style={{ maxWidth: 320 }}>
        <label>Account name prefix</label>
        <input value={accountNamePrefix} onChange={(e) => setAccountNamePrefix(e.target.value)} />
      </div>

      <div className="section-title">Preview (first {Math.min(5, staged.previewRows.length)} rows)</div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              {['Holding', 'Shares', 'Currency', 'Cost basis', 'Cost per share'].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staged.previewRows.slice(0, 5).map((row, i) => (
              <tr key={i}>
                {['Holding', 'Shares', 'Currency', 'Cost basis', 'Cost per share'].map((h) => (
                  <td key={h}>{row[h]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {commit.data && !commit.data.committed && (
        <div className="banner" style={{ background: 'color-mix(in srgb, var(--critical) 14%, var(--surface-1))', display: 'block' }}>
          <strong>Import failed</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            {commit.data.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button className="btn" onClick={onBack}>
          Back
        </button>
        <button
          className="btn btn-primary"
          disabled={commit.isPending || !accountNamePrefix.trim()}
          onClick={() => commit.mutate({ importBatchId: staged.importBatchId, accountNamePrefix: accountNamePrefix.trim() })}
        >
          {commit.isPending ? 'Importing…' : 'Import holdings snapshot'}
        </button>
      </div>
    </div>
  );
}

function TransactionsConfirm({ staged, onDone, onBack }: { staged: ImportBatchPreview; onDone: () => void; onBack: () => void }) {
  const [accountNamePrefix, setAccountNamePrefix] = useState('Snowball Import');
  const commit = useCommitSnowballTransactions();
  const summary = staged.transactionsSummary;

  if (commit.data?.committed) {
    return (
      <div className="card">
        <h3>Import complete</h3>
        <p>Imported {commit.data.rowsCommitted} transactions with their original dates.</p>
        <button className="btn btn-primary" onClick={onDone}>
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>
        Review import — detected format: <strong>Snowball Analytics transactions</strong> ({summary?.transactionCount ?? staged.rowCount}{' '}
        buy/sell/dividend rows{summary?.dateRange ? `, ${summary.dateRange.from} to ${summary.dateRange.to}` : ''})
      </h3>
      <p className="text-secondary" style={{ fontSize: 13 }}>
        No column mapping is needed — Snowball's export doesn't include an amount column, so it's computed per row (price × quantity
        ± fee for buys/sells; the net cash amount for dividends) and each transaction keeps its original date.
      </p>
      {summary && summary.currencies.length > 0 && (
        <p className="text-secondary" style={{ fontSize: 13 }}>
          Currencies detected: <strong>{summary.currencies.join(', ')}</strong> — a separate account is created per currency.
        </p>
      )}
      {summary && summary.skippedCount > 0 && (
        <div className="banner">
          {summary.skippedCount} row(s) skipped — account-level cash events (e.g. tax refunds) with no associated ticker don't fit
          the per-holding transaction ledger.
        </div>
      )}

      <div className="form-field" style={{ maxWidth: 320 }}>
        <label>Account name prefix</label>
        <input value={accountNamePrefix} onChange={(e) => setAccountNamePrefix(e.target.value)} />
      </div>

      <div className="section-title">Preview (first {Math.min(5, staged.previewRows.length)} rows)</div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              {['Event', 'Date', 'Symbol', 'Price', 'Quantity', 'Currency', 'FeeTax'].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staged.previewRows.slice(0, 5).map((row, i) => (
              <tr key={i}>
                {['Event', 'Date', 'Symbol', 'Price', 'Quantity', 'Currency', 'FeeTax'].map((h) => (
                  <td key={h}>{row[h]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {commit.data && !commit.data.committed && (
        <div className="banner" style={{ background: 'color-mix(in srgb, var(--critical) 14%, var(--surface-1))', display: 'block' }}>
          <strong>Import failed</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            {commit.data.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button className="btn" onClick={onBack}>
          Back
        </button>
        <button
          className="btn btn-primary"
          disabled={commit.isPending || !accountNamePrefix.trim()}
          onClick={() => commit.mutate({ importBatchId: staged.importBatchId, accountNamePrefix: accountNamePrefix.trim() })}
        >
          {commit.isPending ? 'Importing…' : 'Import transactions'}
        </button>
      </div>
    </div>
  );
}

function ImportWizard({ onDone }: { onDone: () => void }) {
  const [staged, setStaged] = useState<ImportBatchPreview | null>(null);
  const [mapping, setMapping] = useState<Record<CanonicalFieldKey, string | null> | null>(null);
  const [accountName, setAccountName] = useState('');
  const [currency, setCurrency] = useState('GBP');
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

  if (staged?.isSnapshotFormat) {
    return <SnapshotConfirm staged={staged} onDone={onDone} onBack={() => setStaged(null)} />;
  }

  if (staged?.specialImportMode === 'snowball_transactions') {
    return <TransactionsConfirm staged={staged} onDone={onDone} onBack={() => setStaged(null)} />;
  }

  if (!staged || !mapping) {
    return (
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Import transactions from CSV</h3>
        <p className="text-secondary">
          Supports Fidelity, Schwab, Robinhood, and Snowball Analytics (transactions or holdings-snapshot) exports, or any CSV with
          symbol/date/action/quantity/price columns — anything that doesn't auto-detect can be mapped manually on the next step.
        </p>
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
        {canonicalFieldKeys.map((field) => {
          const required = REQUIRED_FIELDS.includes(field);
          const unmapped = required && !mapping[field];
          return (
            <div className="form-field" key={field}>
              <label>
                {FIELD_LABELS[field]}
                {required && <span style={{ color: 'var(--critical)' }}> *</span>}
              </label>
              <select
                value={mapping[field] ?? ''}
                onChange={(e) => setMapping({ ...mapping, [field]: e.target.value || null })}
                style={unmapped ? { borderColor: 'var(--critical)' } : undefined}
              >
                <option value="">— none —</option>
                {staged.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
      {REQUIRED_FIELDS.some((f) => !mapping[f]) && (
        <div className="banner" style={{ background: 'color-mix(in srgb, var(--critical) 14%, var(--surface-1))', marginTop: 4 }}>
          Map a column for {REQUIRED_FIELDS.filter((f) => !mapping[f]).map((f) => FIELD_LABELS[f]).join(', ')} (marked *) before
          importing — these are required for every row.
        </div>
      )}

      <div className="section-title">Brokerage account</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div className="form-field" style={{ maxWidth: 320 }}>
          <label>Account</label>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">Create new account…</option>
            {(accounts ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.accountName} ({a.currency})
              </option>
            ))}
          </select>
          {!accountId && (
            <input placeholder="New account name (e.g. Trading 212 ISA)" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
          )}
        </div>
        {!accountId && (
          <div className="form-field" style={{ maxWidth: 140 }}>
            <label>Currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
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
        <div className="banner" style={{ background: 'color-mix(in srgb, var(--critical) 14%, var(--surface-1))', display: 'block' }}>
          <strong>Import failed</strong> — nothing was committed.
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            {commit.data.errors.slice(0, 8).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
          {commit.data.errors.length > 8 && <div>…and {commit.data.errors.length - 8} more.</div>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button className="btn" onClick={() => setStaged(null)}>
          Back
        </button>
        <button
          className="btn btn-primary"
          disabled={commit.isPending || (!accountId && !accountName.trim()) || REQUIRED_FIELDS.some((f) => !mapping[f])}
          onClick={() =>
            commit.mutate({
              importBatchId: staged.importBatchId,
              mapping,
              brokerageAccountId: accountId || null,
              newAccountName: accountId ? null : accountName.trim(),
              currency,
            })
          }
        >
          {commit.isPending ? 'Importing…' : 'Commit import'}
        </button>
      </div>
    </div>
  );
}

function ResetPortfolioButton() {
  const [confirming, setConfirming] = useState(false);
  const reset = useResetPortfolio();

  if (!confirming) {
    return (
      <button className="btn" onClick={() => setConfirming(true)}>
        Reset portfolio
      </button>
    );
  }

  return (
    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: 'var(--critical)' }}>Delete all holdings, transactions & accounts?</span>
      <button
        className="btn"
        style={{ background: 'var(--critical)', borderColor: 'var(--critical)', color: 'white' }}
        disabled={reset.isPending}
        onClick={() => reset.mutate(undefined, { onSuccess: () => setConfirming(false) })}
      >
        {reset.isPending ? 'Resetting…' : 'Yes, delete everything'}
      </button>
      <button className="btn" onClick={() => setConfirming(false)}>
        Cancel
      </button>
    </span>
  );
}

const TX_TYPES = ['buy', 'sell', 'dividend', 'split', 'transfer_in', 'transfer_out', 'fee', 'interest'];

function EditTransactionRow({ tx, onCancel }: { tx: Transaction; onCancel: () => void }) {
  const update = useUpdateTransaction();
  const [form, setForm] = useState({
    ticker: tx.ticker,
    transactionType: tx.transactionType as string,
    tradeDate: tx.tradeDate.slice(0, 10),
    quantity: tx.quantity,
    price: tx.price ?? 0,
    amount: tx.amount,
  });

  return (
    <tr>
      <td>
        <input type="date" value={form.tradeDate} onChange={(e) => setForm({ ...form, tradeDate: e.target.value })} style={{ width: 130 }} />
      </td>
      <td>
        <input value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value.toUpperCase() })} style={{ width: 70 }} />
      </td>
      <td>
        <select value={form.transactionType} onChange={(e) => setForm({ ...form, transactionType: e.target.value })}>
          {TX_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </td>
      <td style={{ textAlign: 'right' }}>
        <input
          type="number"
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
          style={{ width: 80, textAlign: 'right' }}
        />
      </td>
      <td style={{ textAlign: 'right' }}>
        <input
          type="number"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
          style={{ width: 80, textAlign: 'right' }}
        />
      </td>
      <td style={{ textAlign: 'right' }}>
        <input
          type="number"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
          style={{ width: 90, textAlign: 'right' }}
        />
      </td>
      <td>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn btn-primary"
            style={{ padding: '2px 8px', fontSize: 12 }}
            disabled={update.isPending}
            onClick={() =>
              update.mutate(
                {
                  id: tx.id,
                  updates: {
                    ticker: form.ticker,
                    transactionType: form.transactionType,
                    tradeDate: form.tradeDate,
                    quantity: form.quantity,
                    price: form.price,
                    amount: form.amount,
                  },
                },
                { onSuccess: onCancel },
              )
            }
          >
            Save
          </button>
          <button className="btn" style={{ padding: '2px 8px', fontSize: 12 }} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );
}

export function PortfolioPage() {
  const { data: holdings } = useHoldings();
  const { data: transactions } = useTransactions();
  const deleteTx = useDeleteTransaction();
  const [showImport, setShowImport] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Portfolio</h1>
          <p className="page-subtitle">Holdings and transaction history</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <ResetPortfolioButton />
          <button className="btn btn-primary" onClick={() => setShowImport((s) => !s)}>
            {showImport ? 'Close' : '+ Import CSV'}
          </button>
        </div>
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
              { key: 'avgCost', header: 'Avg cost', align: 'right', render: (h) => <Money value={h.avgCostBasis} currency={h.currency} /> },
              { key: 'price', header: 'Price', align: 'right', render: (h) => <Money value={h.lastPrice} currency={h.currency} /> },
              { key: 'change', header: 'Change', align: 'right', render: (h) => <ChangeBadge value={h.changePct} /> },
              { key: 'value', header: 'Market value', align: 'right', render: (h) => <Money value={h.marketValue} currency={h.currency} /> },
              {
                key: 'gain',
                header: 'Unrealized gain',
                align: 'right',
                render: (h) => (
                  <span className={h.unrealizedGain !== null && h.unrealizedGain >= 0 ? 'delta-up' : 'delta-down'}>
                    <Money value={h.unrealizedGain} currency={h.currency} /> {h.unrealizedGainPct !== null && `(${h.unrealizedGainPct.toFixed(1)}%)`}
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
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Ticker</th>
                  <th>Action</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Price</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(transactions ?? []).map((t) =>
                  editingId === t.id ? (
                    <EditTransactionRow key={t.id} tx={t} onCancel={() => setEditingId(null)} />
                  ) : (
                    <tr key={t.id}>
                      <td>{format(new Date(t.tradeDate), 'MMM d, yyyy')}</td>
                      <td>
                        <span className="ticker-chip">{t.ticker}</span>
                      </td>
                      <td>
                        <TransactionTypeBadge type={t.transactionType} />
                      </td>
                      <td style={{ textAlign: 'right' }}>{t.quantity ? t.quantity.toLocaleString() : '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <Money value={t.price} currency={t.currency} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Money value={t.amount} currency={t.currency} />
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => setEditingId(t.id)}>
                            Edit
                          </button>
                          <button className="btn" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => deleteTx.mutate(t.id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
