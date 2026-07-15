import { Link } from 'react-router-dom';
import { useProviderStatus } from '../../api/hooks/useMarketData';

const PROVIDER_LABELS: Record<string, string> = {
  finnhub: 'Finnhub (news, insider trades, quotes)',
  alpha_vantage: 'Alpha Vantage (dividends)',
  sec_edgar: 'SEC EDGAR (whale/13F activity)',
};

export function ApiKeyMissingBanner({ providers }: { providers: string[] }) {
  const { data } = useProviderStatus();
  const missing = (data ?? []).filter((p) => providers.includes(p.provider) && p.usingSeedData);
  if (missing.length === 0) return null;

  return (
    <div className="banner">
      <span>⚠</span>
      <span>
        Showing sample data for {missing.map((p) => PROVIDER_LABELS[p.provider] ?? p.provider).join(', ')} — add your API key in{' '}
        <Link to="/settings">Settings</Link> to see live data.
      </span>
    </div>
  );
}
