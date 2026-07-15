import type { ReactNode } from 'react';

interface StatTileProps {
  label: string;
  value: ReactNode;
  delta?: { value: string; positive: boolean } | null;
}

export function StatTile({ label, value, delta }: StatTileProps) {
  return (
    <div className="stat-tile">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {delta && <div className={`stat-delta ${delta.positive ? 'delta-up' : 'delta-down'}`}>{delta.value}</div>}
    </div>
  );
}
