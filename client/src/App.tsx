import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AppShell } from './components/layout/AppShell';
import { RequireAuth } from './components/layout/RequireAuth';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { DividendsPage } from './pages/DividendsPage';
import { WatchlistPage } from './pages/WatchlistPage';
import { NewsPage } from './pages/NewsPage';
import { WhaleActivityPage } from './pages/WhaleActivityPage';
import { InsiderTradingPage } from './pages/InsiderTradingPage';
import { PoliticalTradingPage } from './pages/PoliticalTradingPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  const qc = useQueryClient();

  useEffect(() => {
    function onUnauthorized() {
      qc.setQueryData(['auth', 'me'], null);
    }
    window.addEventListener('stockdash:unauthorized', onUnauthorized);
    return () => window.removeEventListener('stockdash:unauthorized', onUnauthorized);
  }, [qc]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/dividends" element={<DividendsPage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/whale-activity" element={<WhaleActivityPage />} />
        <Route path="/insider-trading" element={<InsiderTradingPage />} />
        <Route path="/political-trading" element={<PoliticalTradingPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
