import Layout from '../components/Layout';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../lib/auth';
import { listPosts, createPost, reportPost } from '../lib/db';
import { uploadFile, publicUrl } from '../lib/storage';
import { toast } from '../lib/toast';
import Avatar from '../components/Avatar';

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  return Math.floor(s / 86400) + 'd';
}

function fileNameFromPath(path = '') {
  return decodeURIComponent(path.split('/').pop() || 'attachment').replace(/^\d+-/, '');
}

function PostAttachment({ post }) {
  if (!post.file_path) return null;
  const url = publicUrl('post-files', post.file_path);
  const name = fileNameFromPath(post.file_path);
  const isImage = /\.(png|jpe?g|gif|webp)$/i.test(name);
  const isPdf = /\.pdf$/i.test(name);

  if (isImage) {
    return (
      <a className="post-attachment preview" href={url} target="_blank" rel="noreferrer">
        <img src={url} alt={name} />
      </a>
    );
  }

  if (isPdf) {
    return (
      <div className="post-attachment preview">
        <iframe src={url} title={name} />
        <a className="btn ghost sm" href={url} target="_blank" rel="noreferrer">Open PDF</a>
      </div>
    );
  }

  return (
    <a className="post-attachment file" href={url} target="_blank" rel="noreferrer">
      <span>📎</span>
      <span>{name}</span>
    </a>
  );
}

export default function Community() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [link, setLink] = useState('');
  const [showLink, setShowLink] = useState(false);
  const [file, setFile] = useState(null);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef(null);

  const refresh = async () => {
    const { data } = await listPosts();
    setPosts((data || []).map(p => ({
      ...p, author_name: p.author_name || p.profiles?.full_name || 'User',
    })));
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() || !user) return;
    setPosting(true);
    try {
      let file_path = null;
      if (file) {
        const up = await uploadFile('post-files', file);
        file_path = up.path;
      }
      const { error } = await createPost({ author_id: user.id, content: text.trim(), link: link || null, file_path });
      if (error) throw error;
      setText(''); setLink(''); setFile(null); setShowLink(false);
      await refresh();
      toast.success('Posted');
    } catch (err) {
      toast.error(err.message);
    }
    setPosting(false);
  };

  const report = async (postId) => {
    if (!user) return;
    const { error } = await reportPost(postId, user.id);
    if (error) return toast.error(error.message);
    toast.success('Reported. Admins will review.');
  };

  return (
    <Layout>
      <div className="page-header">
        <div className="crumb">Feed</div>
        <h1>Community</h1>
        <p className="sub">Share notes, links, and announcements.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 28 }}>
        <div>
          <form className="card" style={{ marginBottom: 18 }} onSubmit={submit}>
            <textarea
              className="textarea"
              placeholder="Share something with the community…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            {showLink && (
              <input
                className="input"
                placeholder="https://..."
                value={link}
                onChange={(e) => setLink(e.target.value)}
                style={{ marginTop: 8 }}
              />
            )}
            {file && (
              <div className="pill" style={{ marginTop: 8, gap: 4 }}>
                📎 {file.name}
                <button type="button" onClick={() => setFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 4 }} aria-label="Remove">×</button>
              </div>
            )}
            <input ref={fileRef} type="file" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <div className="row between" style={{ marginTop: 10 }}>
              <div className="row">
                <button type="button" className="btn ghost sm" onClick={() => fileRef.current?.click()}>📎 Attach</button>
                <button type="button" className="btn ghost sm" onClick={() => setShowLink(s => !s)}>🔗 Link</button>
              </div>
              <button className="btn" type="submit" disabled={posting || !text.trim()}>
                {posting ? 'Posting…' : 'Post'}
              </button>
            </div>
          </form>

          {loading ? (
            <div className="empty">Loading…</div>
          ) : posts.length === 0 ? (
            <div className="empty">Be the first to post.</div>
          ) : posts.map(p => (
            <div key={p.id} className="post">
              <div className="head">
                <Avatar name={p.author_name} id={p.author_id} size={36} />
                <div>
                  <div className="name">{p.author_name}</div>
                  <div className="time">{timeAgo(p.created_at)} ago</div>
                </div>
              </div>
              <div className="body">{p.content}</div>
              {p.link && (
                <a className="pill" href={p.link} target="_blank" rel="noreferrer" style={{ marginRight: 6 }}>
                  🔗 {p.link.replace(/^https?:\/\//, '').slice(0, 40)}
                </a>
              )}
              <PostAttachment post={p} />
              <div className="actions" style={{ marginTop: 10 }}>
                <button className="btn ghost sm" style={{ marginLeft: 'auto', color: 'var(--danger)' }} onClick={() => report(p.id)}>
                  Report
                </button>
              </div>
            </div>
          ))}
        </div>

        <div>
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Guidelines</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>
              Be kind. No spam. Share resources useful to your peers. Reported posts are reviewed by admins.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
