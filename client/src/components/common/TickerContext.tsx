import type { MarketContextEntry } from '@stockdash/shared';

function ConsensusBar({ consensus }: { consensus: NonNullable<MarketContextEntry['consensus']> }) {
  const total = consensus.strongBuy + consensus.buy + consensus.hold + consensus.sell + consensus.strongSell;
  if (total === 0) return null;
  const segments = [
    { key: 'strongBuy', label: 'Strong buy', value: consensus.strongBuy, color: 'var(--good)' },
    { key: 'buy', label: 'Buy', value: consensus.buy, color: '#1baf7a' },
    { key: 'hold', label: 'Hold', value: consensus.hold, color: 'var(--text-muted)' },
    { key: 'sell', label: 'Sell', value: consensus.sell, color: '#eb6834' },
    { key: 'strongSell', label: 'Strong sell', value: consensus.strongSell, color: 'var(--critical)' },
  ];
  const leaning = segments.reduce((a, b) => (b.value > a.value ? b : a));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', width: 120, height: 8, borderRadius: 4, overflow: 'hidden' }} title={segments.map((s) => `${s.label}: ${s.value}`).join(' · ')}>
        {segments.map((s) => (
          <div key={s.key} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} />
        ))}
      </div>
      <span className="text-secondary" style={{ fontSize: 12 }}>
        {leaning.label} consensus ({total} analysts)
      </span>
    </div>
  );
}

export function TickerContext({ context }: { context: MarketContextEntry | undefined }) {
  if (!context) return null;
  const { news, consensus } = context;
  if (news.length === 0 && !consensus) return null;

  return (
    <div style={{ padding: '8px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--gridline)' }}>
      {consensus && <ConsensusBar consensus={consensus} />}
      {news.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: consensus ? '6px 0 0' : 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {news.map((n) => (
            <li key={n.id} style={{ fontSize: 12 }}>
              <a href={n.url} target="_blank" rel="noreferrer" className="text-secondary" style={{ textDecoration: 'none' }}>
                {n.headline}
              </a>
              <span className="text-muted"> · {n.source}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
