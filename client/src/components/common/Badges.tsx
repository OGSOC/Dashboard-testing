export function ChangeBadge({ value }: { value: number | null }) {
  if (value === null || Number.isNaN(value)) return <span className="text-muted">—</span>;
  const positive = value >= 0;
  return <span className={positive ? 'delta-up' : 'delta-down'}>{positive ? '+' : ''}{value.toFixed(2)}%</span>;
}

export function TransactionTypeBadge({ type }: { type: string }) {
  const cls = type === 'buy' ? 'badge-buy' : type === 'sell' ? 'badge-sell' : 'badge-neutral';
  return <span className={`badge ${cls}`}>{type.replace('_', ' ')}</span>;
}

export function Money({ value, currency = 'USD' }: { value: number | null; currency?: string }) {
  if (value === null || Number.isNaN(value)) return <span className="text-muted">—</span>;
  return <>{new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)}</>;
}
