import Layout from '../../components/Layout';
import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useRouter } from 'next/router';
import { listReports, setBanned, deletePost, dismissReports } from '../../lib/db';
import { toast } from '../../lib/toast';
import Avatar from '../../components/Avatar';
import FadeIn from '../../components/FadeIn';

function timeAgo(iso) {
  if (!iso) return '';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  return Math.floor(s / 86400) + 'd';
}

export default function Reports() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.replace('/');
    }
  }, [user]);

  const refresh = async () => {
    const { data } = await listReports();
    setReports(data || []);
    setLoading(false);
  };
  useEffect(() => { if (user) refresh(); }, [user]);

  const ban = async (uid, name) => {
    if (!uid) return;
    if (!confirm(`Ban ${name || 'this user'}?`)) return;
    await setBanned(uid, true);
    toast.success('User banned');
    await refresh();
  };

  const remove = async (postId) => {
    if (!confirm('Delete this post?')) return;
    await deletePost(postId);
    toast.success('Post deleted');
    await refresh();
  };

  const dismiss = async (postId) => {
    await dismissReports(postId);
    toast.success('Reports dismissed');
    await refresh();
  };

  return (
    <Layout>
      <FadeIn>
        <div className="page-header">
          <div className="crumb">Administration</div>
          <h1>Reports</h1>
          <p className="sub">{reports.length} {reports.length === 1 ? 'post' : 'posts'} flagged by the community.</p>
        </div>
      </FadeIn>

      {loading ? (
        <div className="empty">Loading…</div>
      ) : reports.length === 0 ? (
        <FadeIn>
          <div className="empty">
            <span className="empty-icon">✅</span>
            <div style={{ fontSize: 18, fontWeight: 800 }}>All clear</div>
            <div style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 600 }}>No reports right now.</div>
          </div>
        </FadeIn>
      ) : reports.map((r, i) => (
        <FadeIn key={r.id} delay={i * 60}>
          <div className="post-card">
            <div className="head">
              <Avatar name={r.author_name} id={r.author_id} size={40} />
              <div>
                <div className="name">{r.author_name || 'User'}</div>
                <div className="time">{timeAgo(r.created_at)} · <span style={{ color: 'var(--danger)', fontWeight: 800 }}>{r.count} {r.count === 1 ? 'report' : 'reports'}</span></div>
              </div>
            </div>
            <div className="body">"{r.content}"</div>
            <div className="actions" style={{ marginTop: 12 }}>
              <button className="post-action" onClick={() => dismiss(r.id)}>Dismiss</button>
              <button className="post-action" onClick={() => remove(r.id)}>Delete post</button>
              <button className="post-action" style={{ marginLeft: 'auto', color: 'var(--danger)' }} onClick={() => ban(r.author_id, r.author_name)}>Ban author</button>
            </div>
          </div>
        </FadeIn>
      ))}
    </Layout>
  );
}
