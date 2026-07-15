import { useState } from 'react';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications, useUnreadCount, useMarkRead, useMarkAllRead } from '../../api/hooks/useNotifications';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { data: unread } = useUnreadCount();
  const { data: notifications } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  useOnClickOutside(ref, () => setOpen(false));

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="bell-btn" onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        🔔
        {!!unread?.count && <span className="bell-dot">{unread.count > 9 ? '9+' : unread.count}</span>}
      </button>
      {open && (
        <div className="notification-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--gridline)' }}>
            <strong style={{ fontSize: 13 }}>Notifications</strong>
            <button className="btn" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => markAllRead.mutate()}>
              Mark all read
            </button>
          </div>
          {(notifications ?? []).length === 0 && <div className="notification-item">No notifications yet.</div>}
          {(notifications ?? []).slice(0, 20).map((n) => (
            <div
              key={n.id}
              className={`notification-item${n.isRead ? '' : ' unread'}`}
              onClick={() => {
                if (!n.isRead) markRead.mutate(n.id);
                setOpen(false);
                navigate('/notifications');
              }}
            >
              <div style={{ fontWeight: 600 }}>{n.title}</div>
              <div className="text-secondary">{n.body}</div>
              <div className="text-muted" style={{ marginTop: 4 }}>
                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
