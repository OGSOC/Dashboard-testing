import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { usePortfolioSummary, useHoldings } from '../api/hooks/usePortfolio';
import { useDividendSummary, useDividendCalendar } from '../api/hooks/useDividends';
import { useNotifications } from '../api/hooks/useNotifications';
import { useNews } from '../api/hooks/useMarketData';
import { StatTile } from '../components/common/StatTile';
import { EmptyState } from '../components/common/EmptyState';
import { Money } from '../components/common/Badges';
import { useMe } from '../api/hooks/useAuth';
import { currencySymbol } from '../lib/currency';
import { format } from 'date-fns';

export function DashboardPage() {
  const { data: summary } = usePortfolioSummary();
  const { data: holdings } = useHoldings();
  const { data: dividendSummary } = useDividendSummary();
  const { data: dividendCalendar } = useDividendCalendar();
  const { data: notifications } = useNotifications();
  const { data: news } = useNews();
  const { data: user } = useMe();
  const symbol = currencySymbol(user?.displayCurrency);

  const chartData = (holdings ?? [])
    .filter((h) => h.marketValue !== null)
    .sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0))
    .slice(0, 8)
    .map((h) => ({ ticker: h.ticker, value: Math.round(h.marketValue ?? 0) }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Your portfolio at a glance</p>
        </div>
      </div>

      <div className="stat-grid">
        <StatTile label="Portfolio value" value={summary ? <Money value={summary.totalMarketValue} /> : '—'} />
        <StatTile
          label="Today"
          value={summary ? <Money value={summary.dayChangeValue} /> : '—'}
          delta={summary ? { value: `${summary.dayChangePct >= 0 ? '+' : ''}${summary.dayChangePct.toFixed(2)}%`, positive: summary.dayChangePct >= 0 } : null}
        />
        <StatTile
          label="Unrealized gain"
          value={summary ? <Money value={summary.totalUnrealizedGain} /> : '—'}
          delta={summary ? { value: `${summary.totalUnrealizedGainPct >= 0 ? '+' : ''}${summary.totalUnrealizedGainPct.toFixed(2)}%`, positive: summary.totalUnrealizedGainPct >= 0 } : null}
        />
        <StatTile label="Projected dividend income (12mo)" value={dividendSummary ? <Money value={dividendSummary.projectedNext12m} /> : '—'} />
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Holdings by market value</h3>
          {chartData.length === 0 ? (
            <EmptyState title="No holdings yet" body="Import a CSV from the Portfolio page to get started." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid stroke="var(--gridline)" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `${symbol}${(v / 1000).toFixed(0)}k`} stroke="var(--text-muted)" fontSize={12} />
                <YAxis type="category" dataKey="ticker" width={56} stroke="var(--text-muted)" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
                  formatter={(v: number) => [`${symbol}${v.toLocaleString()}`, 'Market value']}
                />
                <Bar dataKey="value" fill="#2a78d6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Upcoming dividends</h3>
          {(dividendCalendar ?? []).filter((d) => new Date(d.exDividendDate) >= new Date()).length === 0 ? (
            <EmptyState title="Nothing scheduled" body="No upcoming ex-dividend dates for your tracked tickers." />
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {(dividendCalendar ?? [])
                .filter((d) => new Date(d.exDividendDate) >= new Date())
                .slice(0, 6)
                .map((d) => (
                  <li key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gridline)' }}>
                    <span className="ticker-chip">{d.ticker}</span>
                    <span className="text-secondary">{format(new Date(d.exDividendDate), 'MMM d, yyyy')}</span>
                    <span>{symbol}{Number(d.amount).toFixed(2)}/sh</span>
                  </li>
                ))}
            </ul>
          )}
          <Link to="/dividends" style={{ fontSize: 13, display: 'inline-block', marginTop: 10 }}>
            View dividend calendar →
          </Link>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Recent notifications</h3>
          {(notifications ?? []).length === 0 ? (
            <EmptyState title="No notifications yet" />
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {(notifications ?? []).slice(0, 6).map((n) => (
                <li key={n.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--gridline)' }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{n.title}</div>
                  <div className="text-secondary" style={{ fontSize: 13 }}>{n.body}</div>
                </li>
              ))}
            </ul>
          )}
          <Link to="/notifications" style={{ fontSize: 13, display: 'inline-block', marginTop: 10 }}>
            View all notifications →
          </Link>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Latest news</h3>
          {(news ?? []).length === 0 ? (
            <EmptyState title="No news yet" />
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {(news ?? []).slice(0, 6).map((n) => (
                <li key={n.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--gridline)' }}>
                  <a href={n.url} target="_blank" rel="noreferrer" style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', textDecoration: 'none' }}>
                    {n.headline}
                  </a>
                  <div className="text-muted" style={{ fontSize: 12 }}>{n.ticker} · {n.source}</div>
                </li>
              ))}
            </ul>
          )}
          <Link to="/news" style={{ fontSize: 13, display: 'inline-block', marginTop: 10 }}>
            View all news →
          </Link>
        </div>
      </div>
    </div>
  );
}
