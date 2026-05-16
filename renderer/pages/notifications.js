import Layout from '../components/Layout';
import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { listNotifications, markNotificationRead, markAllNotificationsRead, listAccessRequests, approveAccessRequest, rejectAccessRequest } from '../lib/db';
import { toast } from '../lib/toast';
import FadeIn from '../components/FadeIn';
import Link from 'next/link';

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

  const handleApprove = async (notif) => {
    const { data: reqs } = await listAccessRequests();
    const req = (reqs || []).find(r => r.moduleId === notif.moduleId && r.status === 'pending');
    if (req) {
      await approveAccessRequest(req.id);
      toast.success('Accès approuvé');
    }
    await markNotificationRead(notif.id);
    loadNotifications();
  };

  const handleReject = async (notif) => {
    const { data: reqs } = await listAccessRequests();
    const req = (reqs || []).find(r => r.moduleId === notif.moduleId && r.status === 'pending');
    if (req) {
      await rejectAccessRequest(req.id);
      toast.success('Accès refusé');
    }
    await markNotificationRead(notif.id);
    loadNotifications();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type) => {
    switch (type) {
      case 'post': return '📝';
      case 'live': return '🎥';
      case 'report': return '🚩';
      case 'access_request': return '🔑';
      case 'access_approved': return '✅';
      case 'access_rejected': return '❌';
      default: return '🔔';
    }
  };

  const getGradient = (type) => {
    switch (type) {
      case 'post': return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      case 'live': return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
      case 'report': return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
      case 'access_request': return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
      case 'access_approved': return 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
      case 'access_rejected': return 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
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
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>Aucune notification</div>
            <div style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 600 }}>Vous n'avez pas encore de notifications.</div>
          </div>
        </FadeIn>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {notifications.map((n, i) => (
            <FadeIn key={n.id} delay={i * 50}>
              <div
                className="card"
                style={{
                  padding: 24,
                  borderLeft: n.read ? '4px solid var(--line)' : '4px solid var(--accent)',
                  background: n.read ? 'var(--surface)' : 'var(--accent-soft)',
                  transition: 'all 0.3s var(--ease)',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  if (!n.read) markRead(n.id);
                  if (n.post_id) window.location.href = '/community';
                  if (n.moduleId) window.location.href = `/module?id=${n.moduleId}`;
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
                      background: n.read ? 'var(--bg)' : 'white',
                      borderRadius: 16,
                      boxShadow: n.read ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.15)',
                      flexShrink: 0
                    }}>
                      {getIcon(n.type)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>{n.title}</div>
                      <div style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 8, lineHeight: 1.5, fontWeight: 500 }}>{n.message}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>
                        {n.created_at ? `${new Date(n.created_at).toLocaleDateString()} · ${new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Date invalide'}
                      </div>
                      {n.type === 'access_request' && !n.read && (
                        <div className="row" style={{ gap: 8, marginTop: 10 }}>
                          <button className="btn sm" onClick={e => { e.stopPropagation(); handleApprove(n); }}>✅ Approuver</button>
                          <button className="btn ghost sm" onClick={e => { e.stopPropagation(); handleReject(n); }}>❌ Refuser</button>
                        </div>
                      )}
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
