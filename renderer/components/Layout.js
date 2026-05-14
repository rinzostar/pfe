import Sidebar from './Sidebar';
import LiveNotifications from './LiveNotifications';
import { useRequireAuth } from '../lib/auth';

export default function Layout({ children }) {
  const { user, loading } = useRequireAuth();
  if (loading || !user) {
    return (
      <div className="auth"><div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div></div>
    );
  }
  return (
    <div className="app">
      <Sidebar />
      <main className="main">{children}</main>
      <LiveNotifications />
    </div>
  );
}
