import { useProviderStatus } from '../api/hooks/useMarketData';
import { formatDistanceToNow } from 'date-fns';

const PROVIDER_INFO: Record<string, { label: string; feature: string; signupUrl: string | null; envVar: string | null }> = {
  finnhub: { label: 'Finnhub', feature: 'News, insider trades, quotes', signupUrl: 'https://finnhub.io/register', envVar: 'FINNHUB_API_KEY' },
  alpha_vantage: { label: 'Alpha Vantage', feature: 'Dividend calendar & history', signupUrl: 'https://www.alphavantage.co/support/#api-key', envVar: 'ALPHA_VANTAGE_API_KEY' },
  sec_edgar: { label: 'SEC EDGAR', feature: 'Whale / 13F institutional activity', signupUrl: null, envVar: 'SEC_EDGAR_CONTACT_EMAIL' },
  house_stock_watcher: { label: 'House Stock Watcher', feature: 'Political trading (House)', signupUrl: null, envVar: null },
  senate_stock_watcher: { label: 'Senate Stock Watcher', feature: 'Political trading (Senate)', signupUrl: null, envVar: null },
  seed: { label: 'Seed data', feature: 'Sample/demo data', signupUrl: null, envVar: null },
};

export function SettingsPage() {
  const { data: providers } = useProviderStatus();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Data provider status. All providers are free — no paid subscription required.</p>
        </div>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Provider</th>
              <th>Powers</th>
              <th>Status</th>
              <th>Last checked</th>
              <th>Setup</th>
            </tr>
          </thead>
          <tbody>
            {(providers ?? [])
              .filter((p) => p.provider !== 'seed')
              .map((p) => {
                const info = PROVIDER_INFO[p.provider] ?? { label: p.provider, feature: '', signupUrl: null, envVar: null };
                return (
                  <tr key={p.provider}>
                    <td>{info.label}</td>
                    <td className="text-secondary">{info.feature}</td>
                    <td>
                      {p.usingSeedData ? (
                        <span className="badge badge-neutral">Using sample data</span>
                      ) : p.lastError ? (
                        <span className="badge badge-sell">Error — see log</span>
                      ) : (
                        <span className="badge badge-buy">Live</span>
                      )}
                    </td>
                    <td className="text-muted">{p.lastRunAt ? formatDistanceToNow(new Date(p.lastRunAt), { addSuffix: true }) : 'never'}</td>
                    <td>
                      {info.envVar ? (
                        <span className="text-secondary">
                          Set <code>{info.envVar}</code> in <code>.env</code>
                          {info.signupUrl && (
                            <>
                              {' '}
                              (<a href={info.signupUrl} target="_blank" rel="noreferrer">sign up</a>)
                            </>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted">No setup needed</span>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h3 style={{ marginTop: 0 }}>About sample data</h3>
        <p className="text-secondary">
          Any feature whose provider isn't configured (or is temporarily unreachable) automatically falls back to realistic sample
          data so the app stays fully usable. Add the API keys above at any time — no restart required beyond the server picking up
          the new environment variables.
        </p>
      </div>
    </div>
  );
}
