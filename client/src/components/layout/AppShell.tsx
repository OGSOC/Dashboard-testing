import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { NotificationBell } from './NotificationBell';
import { useLogout, useMe } from '../../api/hooks/useAuth';

export function AppShell() {
  const { data: user } = useMe();
  const logout = useLogout();

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-column">
        <div className="topbar">
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
