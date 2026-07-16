import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { NotificationBell } from './NotificationBell';
import { useLogout, useMe, useUpdateCurrency } from '../../api/hooks/useAuth';

const CURRENCIES = ['GBP', 'USD', 'EUR'];

export function AppShell() {
  const { data: user } = useMe();
  const logout = useLogout();
  const updateCurrency = useUpdateCurrency();

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-column">
        <div className="topbar">
          <select
            value={user?.displayCurrency ?? 'GBP'}
            onChange={(e) => updateCurrency.mutate(e.target.value)}
            title="Display currency"
            style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)', fontSize: 13 }}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <NotificationBell />
          <span className="text-secondary" style={{ fontSize: 13 }}>{user?.email}</span>
          <button className="btn" onClick={() => logout.mutate()}>
            Log out
          </button>
        </div>
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
