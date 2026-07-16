import { useState } from 'react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { useDividendCalendar, useDividendSummary, useMonthlyIncome, useYearlyIncome, useDividendGrowth } from '../api/hooks/useDividends';
import { StatTile } from '../components/common/StatTile';
import { DataTable } from '../components/common/DataTable';
import { EmptyState } from '../components/common/EmptyState';
import { Money } from '../components/common/Badges';
import { ApiKeyMissingBanner } from '../components/common/ApiKeyMissingBanner';
import { DividendCalendar } from '../components/dividends/DividendCalendar';
import { DripCalculator } from '../components/dividends/DripCalculator';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function DividendsPage() {
  const [view, setView] = useState<'list' | 'calendar'>('calendar');
  const currentYear = new Date().getFullYear();
  const { data: calendar } = useDividendCalendar();
  const { data: summary } = useDividendSummary();
  const { data: monthly } = useMonthlyIncome(currentYear);
  const { data: yearly } = useYearlyIncome();
  const { data: growth } = useDividendGrowth();

  const monthlyChartData = (monthly?.months ?? []).map((m) => ({ month: MONTH_LABELS[m.month - 1], total: Math.round(m.total * 100) / 100 }));
  const yearlyChartData = (yearly?.years ?? []).map((y) => ({ year: String(y.year), total: Math.round(y.total * 100) / 100 }));

  const growthByTicker = new Map((growth?.tickers ?? []).map((g) => [g.ticker, g]));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dividends</h1>
          <p className="page-subtitle">Income received, projected, growth, and reinvestment analytics</p>
        </div>
      </div>

      <ApiKeyMissingBanner providers={['alpha_vantage']} />

      <div className="stat-grid">
        <StatTile label="Received YTD" value={summary ? <Money value={summary.totalReceivedYtd} /> : '—'} />
        <StatTile label="Received (trailing 12mo)" value={summary ? <Money value={summary.totalReceivedTrailing12m} /> : '—'} />
        <StatTile label="Received (all time)" value={summary ? <Money value={summary.totalReceivedAllTime} /> : '—'} />
        <StatTile label="Projected (next 12mo)" value={summary ? <Money value={summary.projectedNext12m} /> : '—'} />
        <StatTile
          label="Portfolio dividend growth (CAGR)"
          value={growth?.portfolioWeightedCagr !== null && growth?.portfolioWeightedCagr !== undefined ? `${(growth.portfolioWeightedCagr * 100).toFixed(1)}%` : '—'}
        />
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Monthly income ({currentYear})</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyChartData} margin={{ left: 8, right: 16 }}>
              <CartesianGrid stroke="var(--gridline)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
              <YAxis stroke="var(--text-muted)" fontSize={12} />
              <Tooltip contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
              <Bar dataKey="total" name="Received" fill="#2a78d6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Yearly income</h3>
          {yearlyChartData.length === 0 ? (
            <EmptyState title="No dividend history yet" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={yearlyChartData} margin={{ left: 8, right: 16 }}>
                <CartesianGrid stroke="var(--gridline)" vertical={false} />
                <XAxis dataKey="year" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
                <Bar dataKey="total" name="Received" fill="#008300" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Yield on cost &amp; dividend growth by holding</h3>
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
              {
                key: 'cagr',
                header: 'Dividend growth (CAGR)',
                align: 'right',
                render: (r) => {
                  const g = growthByTicker.get(r.ticker);
                  if (!g || g.cagr === null) return <span className="text-muted">— (needs {2 - (g?.yearsOfData ?? 0)}+ yrs data)</span>;
                  return <span className={g.cagr >= 0 ? 'delta-up' : 'delta-down'}>{(g.cagr * 100).toFixed(1)}%</span>;
                },
              },
            ]}
          />
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ marginTop: 0 }}>Dividend calendar</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`btn${view === 'calendar' ? ' btn-primary' : ''}`} onClick={() => setView('calendar')}>
              Calendar
            </button>
            <button className={`btn${view === 'list' ? ' btn-primary' : ''}`} onClick={() => setView('list')}>
              List
            </button>
          </div>
        </div>
        {(calendar ?? []).length === 0 ? (
          <EmptyState title="Nothing scheduled" body="Add holdings or watchlist tickers to see upcoming dividends." />
        ) : view === 'calendar' ? (
          <DividendCalendar entries={calendar ?? []} />
        ) : (
          <DataTable
            rowKey={(d) => d.id}
            rows={calendar ?? []}
            columns={[
              { key: 'ticker', header: 'Ticker', render: (d) => <span className="ticker-chip">{d.ticker}</span> },
              { key: 'ex', header: 'Ex-dividend date', render: (d) => format(new Date(d.exDividendDate), 'MMM d, yyyy') },
              { key: 'pay', header: 'Pay date', render: (d) => (d.payDate ? format(new Date(d.payDate), 'MMM d, yyyy') : '—') },
              { key: 'amount', header: 'Amount/share', align: 'right', render: (d) => <Money value={d.amount} /> },
            ]}
          />
        )}
      </div>

      <DripCalculator />
    </div>
  );
}
