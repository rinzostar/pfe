import Layout from '../components/Layout';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../lib/auth';
import {
  listPosts, createPost, reportPost, togglePostLike, togglePostFavorite, addComment,
  listFaculties, listDepartments, listLevels, listYears,
  listReports, dismissReports, deletePost,
} from '../lib/db';
import { toast } from '../lib/toast';
import Avatar from '../components/Avatar';
import FadeIn from '../components/FadeIn';
import GradientCard from '../components/GradientCard';

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  return Math.floor(s / 86400) + 'd';
}

export default function Community() {
  const { user } = useAuth();
  const [step, setStep] = useState('faculty');
  const [selections, setSelections] = useState({});
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [text, setText] = useState('');
  const [link, setLink] = useState('');
  const [showLink, setShowLink] = useState(false);
  const [items, setItems] = useState([]);
  const [commentsOpen, setCommentsOpen] = useState({});
  const [commentText, setCommentText] = useState({});
  const [reports, setReports] = useState([]);
  const [showReports, setShowReports] = useState(false);

  const normalizePost = (p, myId) => ({
    id: p._id,
    author_id: p.authorId,
    author_name: p.authorName || p.authorId,
    content: p.content,
    link: p.link,
    file_path: p.filePath,
    department_id: p.departmentId,
    year_id: p.yearId,
    created_at: p.createdAt,
    likes: p.likes?.length || 0,
    likedByMe: myId ? (p.likes || []).includes(myId) : false,
    comments: p.comments || [],
    favorites: p.favorites?.length || 0,
    favoritedByMe: myId ? (p.favorites || []).includes(myId) : false,
  });

  const normalizeReport = (r) => ({
    id: r.id,
    postId: r.postId,
    author_id: r.author_id,
    author_name: r.author_name || 'Unknown User',
    content: r.content,
    link: r.link,
    created_at: r.created_at,
    count: r.count || 0,
  });

  const loadFaculties = async () => {
    setLoading(true);
    const { data } = await listFaculties();
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadFaculties();
  }, []);

  const select = async (key, value) => {
    const next = { ...selections, [key]: value };
    setSelections(next);
    if (key === 'faculty') {
      setStep('department');
      setLoading(true);
      const { data } = await listDepartments(value.id);
      setItems(data || []);
      setLoading(false);
    } else if (key === 'department') {
      setStep('level');
      setLoading(true);
      const { data } = await listLevels();
      setItems(data || []);
      setLoading(false);
    } else if (key === 'level') {
      setStep('year');
      setLoading(true);
      const { data } = await listYears(value.id);
      setItems(data || []);
      setLoading(false);
    } else if (key === 'year') {
      setStep('posts');
      refreshPosts(next.department?.id, value.id);
      if (user?.role === 'admin') {
        const { data: r } = await listReports();
        setReports(r || []);
      }
    }
  };

  const refreshPosts = async (deptId, yearId) => {
    setLoading(true);
    const { data } = await listPosts({ departmentId: deptId, yearId });
    setPosts((data || []).map(p => normalizePost(p, user?.id)));
    setLoading(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() || !user) return;
    setPosting(true);
    try {
      await createPost({
        author_id: user.id,
        content: text.trim(),
        link: link || null,
        department_id: selections.department?.id,
        year_id: selections.year?.id,
      });
      setText(''); setLink(''); setShowLink(false);
      await refreshPosts(selections.department?.id, selections.year?.id);
      toast.success('Posted!');
    } catch (err) {
      toast.error(err.message);
    }
    setPosting(false);
  };

  const like = async (postId) => {
    if (!user) return;
    await togglePostLike(user.id, postId);
    await refreshPosts(selections.department?.id, selections.year?.id);
  };

  const favorite = async (postId) => {
    if (!user) return;
    await togglePostFavorite(user.id, postId);
    await refreshPosts(selections.department?.id, selections.year?.id);
  };

  const report = async (postId) => {
    if (!user) return;
    await reportPost(postId, user.id);
    await refreshPosts(selections.department?.id, selections.year?.id);
    toast.success('Reported. Admin will review.');
  };

  const submitComment = async (postId) => {
    const txt = commentText[postId];
    if (!txt?.trim() || !user) return;
    await addComment({ post_id: postId, author_id: user.id, author_name: user.name, content: txt.trim() });
    setCommentText(prev => ({ ...prev, [postId]: '' }));
    await refreshPosts(selections.department?.id, selections.year?.id);
  };

  const handleDismissReport = async (postId) => {
    await dismissReports(postId);
    const { data: r } = await listReports();
    setReports((r || []).map(normalizeReport));
    toast.success('Reports dismissed');
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Delete this post?')) return;
    await deletePost(postId);
    await refreshPosts(selections.department?.id, selections.year?.id);
    const { data: r } = await listReports();
    setReports((r || []).map(normalizeReport));
    toast.success('Post deleted');
  };

  const goBack = (targetStep) => {
    const steps = ['faculty', 'department', 'level', 'year', 'posts'];
    const idx = steps.indexOf(targetStep);
    const nextSel = {};
    for (let i = 0; i <= idx; i++) nextSel[steps[i]] = selections[steps[i]];
    setSelections(nextSel);
    setStep(targetStep);
    if (targetStep === 'faculty') loadFaculties();
    else if (targetStep === 'department') listDepartments(nextSel.faculty.id).then(({ data }) => { setItems(data || []); setLoading(false); });
    else if (targetStep === 'level') listLevels().then(({ data }) => { setItems(data || []); setLoading(false); });
    else if (targetStep === 'year') listYears(nextSel.level.id).then(({ data }) => { setItems(data || []); setLoading(false); });
    else if (targetStep === 'posts') refreshPosts(nextSel.department?.id, nextSel.year?.id);
  };

  const breadcrumbs = [
    { key: 'faculty', label: selections.faculty?.name || 'Faculties' },
    { key: 'department', label: selections.department?.name || 'Departments' },
    { key: 'level', label: selections.level?.name || 'Levels' },
    { key: 'year', label: selections.year?.name || 'Years' },
    { key: 'posts', label: 'Posts' },
  ];

  const visibleBreadcrumbs = breadcrumbs.filter((b, i) => {
    const steps = ['faculty', 'department', 'level', 'year', 'posts'];
    return selections[b.key] || steps.indexOf(b.key) <= steps.indexOf(step);
  });

  return (
    <Layout>
      <FadeIn>
        <div className="page-header">
          <div className="crumb">Feed</div>
          <h1>Community</h1>
          <p className="sub">Share notes, links, and announcements with your peers.</p>
        </div>
      </FadeIn>

      {/* Breadcrumbs */}
      <FadeIn delay={80}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28, alignItems: 'center' }}>
          {visibleBreadcrumbs.map((b, i) => (
            <span key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {i > 0 && <span style={{ color: 'var(--ink-4)' }}>/</span>}
              <button
                onClick={() => goBack(b.key)}
                className="pill"
                style={{
                  cursor: selections[b.key] ? 'pointer' : 'default',
                  background: step === b.key ? 'var(--gradient-1)' : 'var(--accent-soft)',
                  color: step === b.key ? 'white' : 'var(--accent)',
                }}
              >
                {b.label}
              </button>
            </span>
          ))}
        </div>
      </FadeIn>

      {/* Hierarchy Selection */}
      {step !== 'posts' && (
        <FadeIn delay={120}>
          <h2 style={{ marginBottom: 18 }}>
            {step === 'faculty' && 'Choose a Faculty'}
            {step === 'department' && 'Choose a Department'}
            {step === 'level' && 'Choose a Level'}
            {step === 'year' && 'Choose a Year'}
          </h2>
          {loading ? (
            <div className="grid auto">
              {[0, 1, 2, 3].map(i => <div key={i} className="skel-card" />)}
            </div>
          ) : (
            <div className="hierarchy-grid">
              {items.map(item => (
                <GradientCard
                  key={item.id}
                  icon={item.icon || '📁'}
                  title={item.name}
                  subtitle={item.code || 'Click to explore'}
                  gradient={item.color || 'var(--gradient-1)'}
                  onClick={() => select(step, item)}
                  active={selections[step]?.id === item.id}
                />
              ))}
            </div>
          )}
        </FadeIn>
      )}

      {/* Posts Feed */}
      {step === 'posts' && (
        <FadeIn delay={120}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 28 }}>
            <div>
              {/* Create Post */}
              <form className="card" style={{ marginBottom: 24 }} onSubmit={submit}>
                <textarea
                  className="textarea"
                  placeholder="Share something with the community…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  style={{ minHeight: 100 }}
                />
                {showLink && (
                  <input
                    className="input"
                    placeholder="https://..."
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    style={{ marginTop: 10 }}
                  />
                )}
                <div className="row between" style={{ marginTop: 12 }}>
                  <div className="row">
                    <button type="button" className="btn ghost sm" onClick={() => setShowLink(s => !s)}>🔗 Link</button>
                  </div>
                  <button className="btn" type="submit" disabled={posting || !text.trim()}>
                    {posting ? 'Posting…' : 'Post'}
                  </button>
                </div>
              </form>

              {/* Posts List */}
              {loading ? (
                <div className="empty">Loading…</div>
              ) : posts.length === 0 ? (
                <div className="empty">
                  <span className="empty-icon">💬</span>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>Be the first to post</div>
                </div>
              ) : posts.map((p, idx) => (
                <FadeIn key={p.id} delay={idx * 60}>
                  <div className="post-card">
                    <div className="head">
                      <Avatar name={p.author_name} id={p.author_id} size={40} />
                      <div>
                        <div className="name">{p.author_name}</div>
                        <div className="time">{timeAgo(p.created_at)} ago</div>
                      </div>
                    </div>
                    <div className="body">{p.content}</div>
                    {p.link && (
                      <a className="pill gradient" href={p.link} target="_blank" rel="noreferrer" style={{ marginBottom: 12, display: 'inline-block' }}>
                        🔗 {p.link.replace(/^https?:\/\//, '').slice(0, 40)}
                      </a>
                    )}
                    <div className="actions">
                      <button className={`post-action ${p.likedByMe ? 'active' : ''}`} onClick={() => like(p.id)}>
                        👍 {p.likes || 0}
                      </button>
                      <button className="post-action" onClick={() => setCommentsOpen(prev => ({ ...prev, [p.id]: !prev[p.id] }))}>
                        💬 {p.comments?.length || 0}
                      </button>
                      <button className={`post-action ${p.favoritedByMe ? 'active' : ''}`} onClick={() => favorite(p.id)}>
                        ⭐ {p.favorites || 0}
                      </button>
                      <button className="post-action" onClick={() => report(p.id)} style={{ color: 'var(--danger)' }}>
                        🚩 Report
                      </button>
                      {user?.role === 'admin' && (
                        <button className="post-action" onClick={() => handleDeletePost(p.id)} style={{ color: 'var(--danger)', marginLeft: 'auto' }}>
                          🗑️ Delete
                        </button>
                      )}
                    </div>

                    {/* Comments */}
                    {commentsOpen[p.id] && (
                      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
                          {(p.comments || []).map(c => (
                            <div key={c.id} className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                              <Avatar name={c.author_name} id={c.author_id} size={28} />
                              <div style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: 12, flex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: 'var(--ink-2)' }}>{c.author_name}</div>
                                <div style={{ fontSize: 14, color: 'var(--ink)' }}>{c.content}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="row" style={{ gap: 10 }}>
                          <input
                            className="input"
                            placeholder="Write a comment..."
                            value={commentText[p.id] || ''}
                            onChange={e => setCommentText(prev => ({ ...prev, [p.id]: e.target.value }))}
                            onKeyPress={e => e.key === 'Enter' && submitComment(p.id)}
                          />
                          <button className="btn sm" onClick={() => submitComment(p.id)}>Send</button>
                        </div>
                      </div>
                    )}
                  </div>
                </FadeIn>
              ))}
            </div>

            {/* Right Sidebar */}
            <div>
              <FadeIn delay={200} direction="right">
                <div className="card" style={{ marginBottom: 20 }}>
                  <h3 style={{ marginBottom: 14, fontSize: 16 }}>📌 Guidelines</h3>
                  <p style={{ fontSize: 14, color: 'var(--ink-2)', fontWeight: 500, lineHeight: 1.6 }}>
                    Be kind. No spam. Share resources useful to your peers. Reported posts are reviewed by year admins.
                  </p>
                </div>
              </FadeIn>

              {user?.role === 'admin' && (
                <FadeIn delay={250} direction="right">
                  <div className="card">
                    <div className="row between" style={{ marginBottom: 14 }}>
                      <h3 style={{ fontSize: 16 }}>🚩 Reports</h3>
                      <button className="btn ghost xs" onClick={() => setShowReports(!showReports)}>
                        {showReports ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {showReports && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {reports.length === 0 ? (
                          <div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 500 }}>No pending reports</div>
                        ) : reports.map(r => (
                          <div key={r.id} className="card" style={{ padding: 14 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{r.author_name}</div>
                            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8 }}>{r.content.slice(0, 80)}...</div>
                            <div className="row" style={{ gap: 6 }}>
                              <button className="btn ghost xs" onClick={() => handleDismissReport(r.id)}>Dismiss</button>
                              <button className="btn danger xs" onClick={() => handleDeletePost(r.id)}>Delete</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </FadeIn>
              )}
            </div>
          </div>
        </FadeIn>
      )}
    </Layout>
  );
}
