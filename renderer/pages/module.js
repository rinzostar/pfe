import Layout from '../components/Layout';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import {
  getModule, listCoursesByModule, listAttachments,
  getActiveLivestreamForModule, toggleFavorite, listFavorites, endLivestream,
  createCourse, deleteCourse, updateCourse, createAttachment, deleteAttachment, updateModule,
  listAccessRequests,
} from '../lib/db';
import { toast } from '../lib/toast';
import FadeIn from '../components/FadeIn';

function ytEmbed(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function firstYoutubeLink(text) {
  return text?.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}[^\s]*/)?.[0] || null;
}

function handleAttachmentClick(fileName, filePath) {
  const isPdf = /\.pdf$/i.test(fileName || filePath);
  const isDoc = /\.(docx?|pptx?)$/i.test(fileName || filePath);
  if (isPdf && filePath && filePath !== '#') {
    window.open(filePath, '_blank');
  } else if (isDoc && filePath && filePath !== '#') {
    const a = document.createElement('a');
    a.href = filePath;
    a.download = fileName || 'download';
    a.click();
  } else {
    toast.info('File not available for download');
  }
}

export default function Module() {
  const router = useRouter();
  const { user } = useAuth();
  const [moduleId, setModuleId] = useState(null);
  const initialCourseRef = useRef(null);
  const [mod, setMod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [live, setLive] = useState(null);
  const [favs, setFavs] = useState(new Set());
  const [openCourse, setOpenCourse] = useState(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editingModule, setEditingModule] = useState(false);
  const [moduleName, setModuleName] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: '', content: '' });
  const [hasAccess, setHasAccess] = useState(false);

  const isOwner = user && mod && user.id === mod.ownerId;
  const isAdmin = user?.role === 'admin';
  const canManage = !!user && (isAdmin || isOwner || hasAccess);
  const canStartLive = canManage;

  const refresh = async () => {
    const currentId = router.isReady ? router.query.id : null;
    if (!currentId || currentId === 'undefined' || currentId === 'null') {
      setLoading(false);
      return;
    }
    setModuleId(currentId);
    try {
      const [m, c, l] = await Promise.all([
        getModule(currentId),
        listCoursesByModule(currentId),
        getActiveLivestreamForModule(currentId),
      ]);
      setMod(m.data);
      setModuleName(m.data?.name || '');
      setCourses(c.data || []);
      setLive(l.data);
      if (user) {
        const { data: f } = await listFavorites(user.id);
        setFavs(new Set((f || []).map(x => x.id)));
        if (!isOwner && user.role === 'professor') {
          const { data: reqs } = await listAccessRequests();
          const approved = (reqs || []).find(r => String(r.moduleId) === String(currentId) && r.professorId === user.id && r.status === 'approved');
          setHasAccess(!!approved);
        }
      }
      if (c.data?.[0]) {
        const ic = router.isReady ? router.query.course : null;
        if (ic) {
          const found = c.data.find(x => String(x.id) === String(ic));
          setOpenCourse(found || c.data[0]);
        } else if (!openCourse) {
          setOpenCourse(c.data[0]);
        }
      }
    } catch (err) {
      console.error('Module refresh error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!router.isReady) return;
    refresh();
  }, [router.isReady, user?.id]);

  const star = async (cid) => {
    if (!user) return;
    await toggleFavorite(user.id, cid);
    setFavs(prev => {
      const s = new Set(prev);
      if (s.has(cid)) s.delete(cid); else s.add(cid);
      return s;
    });
    toast.success(favs.has(cid) ? 'Removed from favorites' : 'Added to favorites');
  };

  const onAddCourse = async (e) => {
    e.preventDefault();
    if (!newCourse.title || !moduleId) return;
    setBusy(true);
    try {
      const { data, error } = await createCourse({
        moduleId: String(moduleId),
        title: newCourse.title.trim(),
        content: newCourse.content.trim(),
        yt_url: firstYoutubeLink(newCourse.content),
      });
      if (error) throw error;
      setOpenCourse(data);
      setShowAdd(false);
      setNewCourse({ title: '', content: '' });
      toast.success('Course added');
      await refresh();
    } catch (err) { toast.error(err.message); }
    setBusy(false);
  };

  const onUpdateModule = async (e) => {
    e.preventDefault();
    if (!moduleName.trim()) return;
    setBusy(true);
    try {
      const { error } = await updateModule(moduleId, { name: moduleName.trim() });
      if (error) throw error;
      setMod(prev => ({ ...prev, name: moduleName.trim() }));
      setEditingModule(false);
      toast.success('Module renamed');
      await refresh();
    } catch (err) { toast.error(err.message); }
    setBusy(false);
  };

  const onUpdateCourse = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await updateCourse(editing.id, {
        title: editing.title.trim(),
        content: editing.content?.trim() || '',
        yt_url: firstYoutubeLink(editing.content) || editing.yt_url?.trim() || null,
      });
      if (error) throw error;
      setOpenCourse(prev => prev?.id === editing.id ? {
        ...prev,
        title: editing.title.trim(),
        content: editing.content?.trim() || '',
        yt_url: firstYoutubeLink(editing.content) || editing.yt_url?.trim() || null,
      } : prev);
      setEditing(null);
      toast.success('Course updated');
      await refresh();
    } catch (err) { toast.error(err.message); }
    setBusy(false);
  };

  const onDeleteCourse = async (cid) => {
    if (!confirm('Are you sure you want to delete this course and all its attachments?')) return;
    setBusy(true);
    try {
      const { error } = await deleteCourse(cid);
      if (error) throw error;
      if (openCourse?.id === cid) setOpenCourse(courses.find(x => x.id !== cid) || null);
      toast.success('Course deleted');
      await refresh();
    } catch (err) { toast.error(err.message); }
    setBusy(false);
  };

  const onFileUpload = async (e, courseId) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const fileName = f.name;
      const fileType = fileName.endsWith('.pdf') ? 'pdf' : fileName.endsWith('.docx') ? 'docx' : fileName.endsWith('.pptx') ? 'pptx' : 'file';
      const { error } = await createAttachment({ course_id: courseId, file: f, file_name: fileName, file_type: fileType });
      if (error) throw error;
      toast.success('File uploaded');
      await refresh();
    } catch (err) { toast.error(err.message); }
    setBusy(false);
    e.target.value = '';
  };

  const startLive = async () => {
    if (!moduleId) return;
    router.push(`/live?module=${String(moduleId)}`);
  };

  const stopLive = async () => {
    if (!live) return;
    setBusy(true);
    await endLivestream(live._id).catch(() => {});
    toast.success('Live session ended');
    setBusy(false);
    refresh();
  };

  if (loading) {
    return (
      <Layout>
        <div className="page-header"><div className="skel" style={{ width: 140, height: 18 }} /></div>
        <div className="grid auto">
          {[0, 1, 2].map(i => <div key={i} className="skel-card" />)}
        </div>
      </Layout>
    );
  }
  if (!mod && router.isReady) return <Layout><div className="empty">Module not found.</div></Layout>;
  if (!router.isReady) {
    return (
      <Layout>
        <div className="page-header"><div className="skel" style={{ width: 140, height: 18 }} /></div>
        <div className="grid auto">
          {[0, 1, 2].map(i => <div key={i} className="skel-card" />)}
        </div>
      </Layout>
    );
  }

  const embed = ytEmbed(openCourse?.yt_url || firstYoutubeLink(openCourse?.content));

  return (
    <Layout>
      <FadeIn>
        <div className="page-header">
          <div className="crumb">
            <Link href="/browse">Browse</Link> / {mod.faculty_name} / {mod.department_name} / {mod.level_name} / {mod.year_name} / {mod.semester_label}
          </div>
          <div className="row between">
            <h1>{mod.name}</h1>
            <div className="row">
              {live && <span className="pill live">Live</span>}
              {live && !canManage && (
                <Link href={`/live?module=${moduleId}`} className="btn live" style={{ padding: '12px 24px' }}>Join live</Link>
              )}
              {live && canManage && (
                <>
                  <Link href={`/live?module=${moduleId}`} className="btn live" style={{ padding: '12px 24px' }}>Open live</Link>
                  <button className="btn ghost sm" onClick={stopLive} disabled={busy}>End</button>
                </>
              )}
              {!live && canStartLive && (
                <button className="btn live" onClick={startLive} disabled={busy} style={{ padding: '12px 24px' }}>
                  {busy ? 'Starting…' : 'Go live'}
                </button>
              )}
            </div>
          </div>
          <p className="sub">{mod.owner_name || 'Unassigned'} · {courses.length} {courses.length === 1 ? 'course' : 'courses'}</p>
          {canManage && (
            <div style={{ marginTop: 14 }}>
              {editingModule ? (
                <form className="row" onSubmit={onUpdateModule} style={{ gap: 10, flexWrap: 'wrap' }}>
                  <input className="input" value={moduleName} onChange={e => setModuleName(e.target.value)} style={{ maxWidth: 360 }} />
                  <button className="btn sm" disabled={busy}>Save</button>
                  <button type="button" className="btn ghost sm" onClick={() => { setEditingModule(false); setModuleName(mod.name); }}>Cancel</button>
                </form>
              ) : (
                <button className="btn ghost sm" onClick={() => setEditingModule(true)}>Rename module</button>
              )}
            </div>
          )}
        </div>
      </FadeIn>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 28 }}>
        <div>
          <div className="row between" style={{ marginBottom: 16 }}>
            <h2>Courses</h2>
            {canManage && !showAdd && (
              <button className="btn sm" onClick={() => setShowAdd(true)}>Add course</button>
            )}
          </div>

          {showAdd && (
            <form className="card" onSubmit={onAddCourse} style={{ marginBottom: 24, border: '2px solid var(--accent)' }}>
              <div className="row between" style={{ marginBottom: 14 }}>
                <h3 style={{ margin: 0 }}>New Course</h3>
                <button type="button" className="btn ghost sm" onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
              <div className="field">
                <label>Title</label>
                <input className="input" required value={newCourse.title} onChange={e => setNewCourse({ ...newCourse, title: e.target.value })} autoFocus />
              </div>
              <div className="field">
                <label>Content</label>
                <textarea
                  className="textarea"
                  placeholder="Type lesson notes, instructions, links, or paste a YouTube link..."
                  value={newCourse.content}
                  onChange={e => setNewCourse({ ...newCourse, content: e.target.value })}
                />
              </div>
              <button className="btn" type="submit" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
                {busy ? 'Adding...' : 'Create Course'}
              </button>
            </form>
          )}

          {courses.length === 0 ? (
            <div className="empty">No courses uploaded yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {courses.map(c => (
                <div key={c.id}>
                  {editing?.id === c.id ? (
                    <form className="card" onSubmit={onUpdateCourse} style={{ marginBottom: 14, padding: 16 }}>
                      <div className="field">
                        <input className="input" value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} />
                      </div>
                      <div className="field">
                        <textarea className="textarea" value={editing.content || ''} onChange={e => setEditing({ ...editing, content: e.target.value })} />
                      </div>
                      <div className="row">
                        <button className="btn sm" type="submit">Save</button>
                        <button className="btn ghost sm" type="button" onClick={() => setEditing(null)}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div
                      className="course-box"
                      style={openCourse?.id === c.id ? { borderColor: 'var(--accent)', boxShadow: 'var(--ring)' } : {}}
                    >
                      <div className="header">
                        <div className="title">{c.title}</div>
                        <span className={`type-badge ${c.yt_url ? 'gradient' : 'pill'}`} style={c.yt_url ? { background: 'var(--gradient-live)', color: 'white' } : {}}>
                          {c.yt_url ? '▶ Video' : '📄 Course'}
                        </span>
                      </div>
                      {c.content && (
                        <div className="content-preview">{c.content.slice(0, 200)}...</div>
                      )}
                      {c.attachments && c.attachments.length > 0 && (
                        <div className="attachments">
                          {c.attachments.map(a => (
                            <button
                              key={a.id}
                              className="attachment-chip"
                              onClick={() => handleAttachmentClick(a.file_name, a.file_path)}
                            >
                              {a.file_type === 'pdf' ? '📄' : a.file_type === 'docx' ? '📝' : '📊'} {a.file_name}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="row between" style={{ marginTop: 4 }}>
                        <div className="row" style={{ gap: 8 }}>
                          {user && (
                            <button className={`fav ${favs.has(c.id) ? 'on' : ''}`} onClick={() => star(c.id)} aria-label="Favorite">
                              {favs.has(c.id) ? '★' : '☆'}
                            </button>
                          )}
                          {canManage && (
                            <>
                              <button className="btn ghost xs" onClick={() => setEditing(c)}>Edit</button>
                              <button className="btn ghost xs" onClick={() => onDeleteCourse(c.id)} style={{ color: 'var(--danger)' }}>Delete</button>
                            </>
                          )}
                        </div>
                        <div className="row" style={{ gap: 8 }}>
                          <Link href={`/chat?courseId=${c.id}&courseTitle=${encodeURIComponent(c.title)}&mode=summarize`} className="btn sm">
                            🤖 Summarize
                          </Link>
                          <button className="btn sm" onClick={() => setOpenCourse(c)}>
                            {openCourse?.id === c.id ? 'Opened' : 'Open'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {openCourse && (
            <>
              <div className="divider" />
              <FadeIn>
                <div style={{ marginBottom: 16 }}>
                  <h2>{openCourse.title}</h2>
                </div>
                {embed ? (
                  <iframe
                    src={embed}
                    style={{ width: '100%', aspectRatio: '16/9', border: 0, borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)' }}
                    allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div style={{
                    aspectRatio: '16 / 9', background: '#0f1117',
                    borderRadius: 'var(--radius)', display: 'grid', placeItems: 'center',
                    color: '#9ca3af', fontSize: 14, fontWeight: 500,
                  }}>
                    No video — see attachments below
                  </div>
                )}
                {openCourse.content && (
                  <div className="course-content" style={{ marginTop: 20, borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
                    {openCourse.content}
                  </div>
                )}
                {openCourse.attachments && openCourse.attachments.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <h3 style={{ marginBottom: 12 }}>Attachments</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {openCourse.attachments.map(a => (
                        <button
                          key={a.id}
                          className="attach"
                          onClick={() => handleAttachmentClick(a.file_name, a.file_path)}
                          style={{ textAlign: 'left', cursor: 'pointer' }}
                        >
                          <div className="row" style={{ gap: 12, flex: 1 }}>
                            <span style={{ fontSize: 22 }}>
                              {a.file_type === 'pdf' ? '📄' : a.file_type === 'docx' ? '📝' : '📊'}
                            </span>
                            <div className="name" style={{ fontWeight: 600 }}>{a.file_name}</div>
                          </div>
                          <span className="pill" style={{ flexShrink: 0 }}>
                            {a.file_type === 'pdf' ? 'Open' : 'Download'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </FadeIn>
            </>
          )}
        </div>

        <div>
          <FadeIn delay={150} direction="right">
            <div className="card" style={{ marginBottom: 18 }}>
              <h3 style={{ marginBottom: 12 }}>About</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, color: 'var(--ink-2)', fontWeight: 500 }}>
                <div className="row" style={{ gap: 8 }}><span>🏫</span> {mod.faculty_name}</div>
                <div className="row" style={{ gap: 8 }}><span>🏢</span> {mod.department_name}</div>
                <div className="row" style={{ gap: 8 }}><span>📅</span> {mod.level_name} · {mod.year_name}</div>
                <div className="row" style={{ gap: 8 }}><span>📆</span> {mod.semester_label}</div>
                <div className="row" style={{ gap: 8 }}><span>👨‍🏫</span> {mod.owner_name || 'Unassigned'}</div>
              </div>
            </div>
          </FadeIn>

          {canManage && openCourse && (
            <FadeIn delay={200} direction="right">
              <div className="card" style={{ marginBottom: 18 }}>
                <h3 style={{ marginBottom: 12 }}>Manage Files</h3>
                <label className="btn" style={{ width: '100%', cursor: 'pointer' }}>
                  Add Attachment
                  <input type="file" hidden onChange={e => onFileUpload(e, openCourse.id)} />
                </label>
              </div>
            </FadeIn>
          )}

          {openCourse && (
            <FadeIn delay={250} direction="right">
              <div className="card">
                <h3 style={{ marginBottom: 12 }}>AI Assistant</h3>
                <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 14, fontWeight: 500 }}>
                  Summarize this course or chat with AI about it.
                </p>
                <Link href={`/chat?courseId=${openCourse.id}&courseTitle=${encodeURIComponent(openCourse.title)}&mode=summarize`} className="btn" style={{ width: '100%', marginBottom: 10 }}>
                  🤖 Summarize
                </Link>
                <Link href={`/chat?courseId=${openCourse.id}&courseTitle=${encodeURIComponent(openCourse.title)}`} className="btn ghost" style={{ width: '100%' }}>
                  💬 Chat about course
                </Link>
              </div>
            </FadeIn>
          )}
        </div>
      </div>
    </Layout>
  );
}
