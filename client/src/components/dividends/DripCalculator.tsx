import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { useDripProjection } from '../../api/hooks/useDividends';
import { Money } from '../common/Badges';

export function DripCalculator() {
  const [years, setYears] = useState(20);
  const [monthlyContribution, setMonthlyContribution] = useState(200);
  const [priceGrowthRatePct, setPriceGrowthRatePct] = useState(7);
  const [dividendGrowthRatePct, setDividendGrowthRatePct] = useState(6);
  const [reinvestDividends, setReinvestDividends] = useState(true);
  const drip = useDripProjection();

  function run() {
    drip.mutate({ years, monthlyContribution, priceGrowthRatePct, dividendGrowthRatePct, reinvestDividends });
  }

  const chartData = (drip.data?.projection ?? []).map((p) => ({
    year: p.year,
    portfolioValue: Math.round(p.portfolioValue),
    annualDividendIncome: Math.round(p.annualDividendIncome),
  }));

  const final = drip.data?.projection[drip.data.projection.length - 1];

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Dividend growth &amp; DRIP calculator</h3>
      <p className="text-secondary" style={{ fontSize: 13 }}>
        Projects your current portfolio value and dividend income forward using compounding price growth, dividend growth, monthly
        contributions, and (optionally) dividend reinvestment.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
        <div className="form-field">
          <label>Years</label>
          <input type="number" min={1} max={50} value={years} onChange={(e) => setYears(Number(e.target.value))} />
        </div>
        <div className="form-field">
          <label>Monthly deposit</label>
          <input type="number" min={0} value={monthlyContribution} onChange={(e) => setMonthlyContribution(Number(e.target.value))} />
        </div>
        <div className="form-field">
          <label>Price growth %/yr</label>
          <input type="number" step={0.1} value={priceGrowthRatePct} onChange={(e) => setPriceGrowthRatePct(Number(e.target.value))} />
        </div>
        <div className="form-field">
          <label>Dividend growth %/yr</label>
          <input type="number" step={0.1} value={dividendGrowthRatePct} onChange={(e) => setDividendGrowthRatePct(Number(e.target.value))} />
        </div>
        <div className="form-field">
          <label>Reinvest (DRIP)</label>
          <select value={reinvestDividends ? 'yes' : 'no'} onChange={(e) => setReinvestDividends(e.target.value === 'yes')}>
            <option value="yes">Yes</option>
            <option value="no">No — take as cash</option>
          </select>
        </div>
      </div>
      <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={run} disabled={drip.isPending}>
        {drip.isPending ? 'Calculating…' : 'Calculate projection'}
      </button>

      {final && (
        <>
          <div className="stat-grid" style={{ marginTop: 18 }}>
            <div className="stat-tile">
              <div className="stat-label">Projected value (yr {final.year})</div>
              <div className="stat-value">
                <Money value={final.portfolioValue} currency={drip.data?.currency} />
              </div>
            </div>
            <div className="stat-tile">
              <div className="stat-label">Projected annual dividend income</div>
              <div className="stat-value">
                <Money value={final.annualDividendIncome} currency={drip.data?.currency} />
              </div>
            </div>
            <div className="stat-tile">
              <div className="stat-label">Total contributed</div>
              <div className="stat-value">
                <Money value={final.cumulativeContributions} currency={drip.data?.currency} />
              </div>
            </div>
            <div className="stat-tile">
              <div className="stat-label">Total dividends received</div>
              <div className="stat-value">
                <Money value={final.cumulativeDividendsReceived} currency={drip.data?.currency} />
              </div>
            </div>
          </div>

          <div className="grid-2">
            <div>
              <div className="text-secondary" style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Portfolio value</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ left: 8, right: 16 }}>
                  <CartesianGrid stroke="var(--gridline)" vertical={false} />
                  <XAxis dataKey="year" stroke="var(--text-muted)" fontSize={12} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
                  <Line type="monotone" dataKey="portfolioValue" name="Portfolio value" stroke="#2a78d6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div>
              <div className="text-secondary" style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Annual dividend income</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ left: 8, right: 16 }}>
                  <CartesianGrid stroke="var(--gridline)" vertical={false} />
                  <XAxis dataKey="year" stroke="var(--text-muted)" fontSize={12} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
                  <Line type="monotone" dataKey="annualDividendIncome" name="Annual dividend income" stroke="#008300" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
