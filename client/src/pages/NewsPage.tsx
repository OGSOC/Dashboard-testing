import { format } from 'date-fns';
import { useNews } from '../api/hooks/useMarketData';
import { EmptyState } from '../components/common/EmptyState';
import { ApiKeyMissingBanner } from '../components/common/ApiKeyMissingBanner';

export function NewsPage() {
  const { data: news } = useNews();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">News</h1>
          <p className="page-subtitle">Latest headlines for your holdings and watchlist</p>
        </div>
      </div>

      <ApiKeyMissingBanner providers={['finnhub']} />

      {(news ?? []).length === 0 ? (
        <div className="card">
          <EmptyState title="No news yet" body="Add holdings or watchlist tickers to see relevant news here." />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {(news ?? []).map((n) => (
            <a
              key={n.id}
              href={n.url}
              target="_blank"
              rel="noreferrer"
              className="card"
              style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="ticker-chip">{n.ticker}</span>
                <span className="text-muted" style={{ fontSize: 12 }}>
                  {format(new Date(n.publishedAt), 'MMM d, yyyy')} · {n.source}
                </span>
              </div>
              <div style={{ fontWeight: 600, marginTop: 6, color: 'var(--text-primary)' }}>{n.headline}</div>
              {n.summary && <div className="text-secondary" style={{ fontSize: 13, marginTop: 4 }}>{n.summary}</div>}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
