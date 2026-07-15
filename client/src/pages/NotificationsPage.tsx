import { formatDistanceToNow } from 'date-fns';
import { useNotifications, useMarkRead, useMarkAllRead } from '../api/hooks/useNotifications';
import { EmptyState } from '../components/common/EmptyState';

const TYPE_ICONS: Record<string, string> = {
  insider_trade: '🕴',
  political_trade: '🏛',
  whale_trade: '🐋',
  dividend_reminder: '💵',
  dividend_increase: '📈',
  news: '📰',
  system: 'ℹ',
};

export function NotificationsPage() {
  const { data: notifications } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Dividend reminders, insider/political/whale activity, and news for your tracked tickers</p>
        </div>
        <button className="btn" onClick={() => markAllRead.mutate()}>
          Mark all read
        </button>
      </div>

      <div className="card">
        {(notifications ?? []).length === 0 ? (
          <EmptyState title="No notifications yet" body="You'll see alerts here as new activity is detected on your holdings and watchlist." />
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {(notifications ?? []).map((n) => (
              <li
                key={n.id}
                className={`notification-item${n.isRead ? '' : ' unread'}`}
                style={{ borderRadius: 8 }}
                onClick={() => !n.isRead && markRead.mutate(n.id)}
              >
                <div style={{ display: 'flex', gap: 10 }}>
                  <span aria-hidden="true">{TYPE_ICONS[n.type] ?? 'ℹ'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{n.title}</div>
                    <div className="text-secondary">{n.body}</div>
                    <div className="text-muted" style={{ marginTop: 4, fontSize: 12 }}>
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
