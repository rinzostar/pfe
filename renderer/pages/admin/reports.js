import Layout from '../../components/Layout';
import { useEffect, useState } from 'react';
import { listReports, setBanned, deletePost, dismissReports } from '../../lib/db';
import { toast } from '../../lib/toast';
import Avatar from '../../components/Avatar';

function timeAgo(iso) {
  if (!iso) return '';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  return Math.floor(s / 86400) + 'd';
}

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const { data } = await listReports();
    setReports(data || []);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

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
      <div className="page-header">
        <div className="crumb">Administration</div>
        <h1>Reports</h1>
        <p className="sub">{reports.length} {reports.length === 1 ? 'post' : 'posts'} flagged by the community.</p>
      </div>

      {loading ? (
        <div className="empty">Loading…</div>
      ) : reports.length === 0 ? (
        <div className="empty">All clear. No reports right now.</div>
      ) : reports.map((r) => (
        <div key={r.id} className="post">
          <div className="head">
            <Avatar name={r.author_name} id={r.author_id} size={36} />
            <div>
              <div className="name">{r.author_name || 'User'}</div>
              <div className="time">{timeAgo(r.created_at)} · <span style={{ color: 'var(--danger)' }}>{r.count} {r.count === 1 ? 'report' : 'reports'}</span></div>
            </div>
          </div>
          <div className="body">"{r.content}"</div>
          <div className="actions" style={{ marginTop: 10 }}>
            <button className="btn ghost sm" onClick={() => dismiss(r.id)}>Dismiss</button>
            <button className="btn ghost sm" onClick={() => remove(r.id)}>Delete post</button>
            <button className="btn danger sm" style={{ marginLeft: 'auto' }} onClick={() => ban(r.author_id, r.author_name)}>Ban author</button>
          </div>
        </div>
      ))}
    </Layout>
  );
}
