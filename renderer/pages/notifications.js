import Layout from '../components/Layout';
import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { listNotifications, markNotificationRead, markAllNotificationsRead } from '../lib/db';
import FadeIn from '../components/FadeIn';

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    const { data } = await listNotifications(user.id);
    setNotifications(data || []);
    setLoading(false);
  };

  const markRead = async (id) => {
    await markNotificationRead(id);
    loadNotifications();
  };

  const markAllRead = async () => {
    await markAllNotificationsRead(user.id);
    loadNotifications();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type) => {
    switch (type) {
      case 'post': return '📝';
      case 'live': return '🎥';
      case 'report': return '🚩';
      case 'access_request': return '🔑';
      default: return '🔔';
    }
  };

  const getGradient = (type) => {
    switch (type) {
      case 'post': return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      case 'live': return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
      case 'report': return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
      case 'access_request': return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
      default: return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
  };

  return (
    <Layout>
      <FadeIn>
        <div className="page-header">
          <div className="crumb">Centre de notifications</div>
          <div className="row between">
            <h1>🔔 Notifications</h1>
            {unreadCount > 0 && (
              <button className="btn ghost sm" onClick={markAllRead}>
                ✓ Tout marquer comme lu
              </button>
            )}
          </div>
          <p className="sub">{unreadCount} notification{unreadCount !== 1 ? 's' : ''} non lue{unreadCount !== 1 ? 's' : ''}</p>
        </div>
      </FadeIn>

      {loading ? (
        <div className="empty">Chargement...</div>
      ) : notifications.length === 0 ? (
        <FadeIn>
          <div className="empty" style={{ padding: 70 }}>
            <span className="empty-icon">🔔</span>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Aucune notification</div>
            <div style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 500 }}>Vous n'avez pas encore de notifications.</div>
          </div>
        </FadeIn>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {notifications.map((n, i) => (
            <FadeIn key={n.id} delay={i * 50}>
              <div 
                className="card"
                style={{ 
                  padding: 22, 
                  borderLeft: n.read ? '4px solid var(--line)' : '4px solid var(--accent)',
                  background: n.read ? 'var(--surface)' : 'var(--accent-soft)',
                  transition: 'all 0.3s var(--ease)',
                  cursor: 'pointer',
                  animation: 'card-entrance 0.4s var(--ease)'
                }}
                onClick={() => {
                  if (!n.read) markRead(n.id);
                  if (n.post_id) window.location.href = '/community';
                  if (n.module_id) window.location.href = `/module?id=${n.module_id}`;
                }}
              >
                <div className="row between">
                  <div className="row" style={{ gap: 16, flex: 1 }}>
                    <div style={{ 
                      fontSize: 28, 
                      width: 56, 
                      height: 56, 
                      display: 'grid', 
                      placeItems: 'center',
                      background: n.read ? 'var(--bg-2)' : 'white',
                      borderRadius: 16,
                      boxShadow: n.read ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.15)',
                      flexShrink: 0
                    }}>
                      {getIcon(n.type)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{n.title}</div>
                      <div style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 8, lineHeight: 1.5 }}>{n.message}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>
                        {new Date(n.created_at).toLocaleDateString()} · {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  {!n.read && (
                    <button 
                      className="btn ghost xs" 
                      onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                      style={{ flexShrink: 0 }}
                    >
                      ✓ Lu
                    </button>
                  )}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      )}
    </Layout>
  );
}
