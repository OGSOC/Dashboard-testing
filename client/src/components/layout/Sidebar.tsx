import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Dashboard', icon: '◆' },
  { to: '/portfolio', label: 'Portfolio', icon: '💼' },
  { to: '/dividends', label: 'Dividends', icon: '💵' },
  { to: '/watchlist', label: 'Watchlist', icon: '★' },
  { to: '/news', label: 'News', icon: '📰' },
  { to: '/whale-activity', label: 'Whale Activity', icon: '🐋' },
  { to: '/insider-trading', label: 'Insider Trading', icon: '🕴' },
  { to: '/political-trading', label: 'Political Trading', icon: '🏛' },
  { to: '/notifications', label: 'Notifications', icon: '🔔' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

export function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-brand">Stock Dashboard</div>
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === '/'}
          className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
        >
          <span aria-hidden="true">{link.icon}</span>
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
