import Layout from '../components/Layout';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import {
  getModule, listCoursesByModule, listAttachments,
  getActiveLivestreamForModule, toggleFavorite, listFavorites, endLivestream,
  createCourse, deleteCourse, updateCourse, createAttachment, deleteAttachment, updateModule,
} from '../lib/db';
import { publicUrl, uploadFile } from '../lib/storage';
import { toast } from '../lib/toast';
import { chatWithCourse, generateCourseDraft } from '../lib/aiClient';

function ytEmbed(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function firstYoutubeLink(text) {
  return text?.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}[^\s]*/)?.[0] || null;
}

function canPreviewFile(fileName = '', path = '') {
  const value = `${fileName} ${path}`.toLowerCase();
  return /\.(png|jpe?g|gif|webp|pdf)$/i.test(value);
}

function AttachmentPreview({ attachment }) {
  const url = publicUrl('course-files', attachment.file_path);
  const name = attachment.file_name || '';
  const isImage = /\.(png|jpe?g|gif|webp)$/i.test(name || url);
  const isPdf = /\.pdf$/i.test(name || url);
  if (!canPreviewFile(name, url)) return null;
  return (
    <div className="embed-box">
      {isImage ? (
        <img src={url} alt={name} />
      ) : isPdf ? (
        <iframe src={url} title={name} />
      ) : null}
    </div>
  );
}

export default function Module() {
  const router = useRouter();
  const { user } = useAuth();
  const id = router.query.id;
  const [mod, setMod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [attach, setAttach] = useState([]);
  const [live, setLive] = useState(null);
  const [favs, setFavs] = useState(new Set());
  const [openCourse, setOpenCourse] = useState(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null); // course object
  const [editingModule, setEditingModule] = useState(false);
  const [moduleName, setModuleName] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: '', content: '' });
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [openRouterKeyInput, setOpenRouterKeyInput] = useState('');
  const [chatText, setChatText] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatModel, setChatModel] = useState('google'); // 'google' or 'openrouter'
  const playerRef = useRef(null);

  const isOwner = user && mod && user.id === mod.owner_id;
  const isAdmin = user?.role === 'admin';
  const canManage = !!user && (isAdmin || isOwner);
  const canStartLive = canManage;

  const refresh = async () => {
    if (!id) return;
    const [m, c, l] = await Promise.all([
      getModule(id),
      listCoursesByModule(id),
      getActiveLivestreamForModule(id),
    ]);
    setMod(m.data);
    setModuleName(m.data?.name || '');
    setCourses(c.data || []);
    setLive(l.data);
    if (c.data?.[0] && !openCourse) setOpenCourse(c.data[0]);
    if (user) {
      const { data: f } = await listFavorites(user.id);
      setFavs(new Set((f || []).map(x => x.id)));
    }
    setLoading(false);
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [id, user?.id]);

  useEffect(() => {
    if (!openCourse) { setAttach([]); return; }
    listAttachments({ courseId: openCourse.id }).then(({ data }) => setAttach(data || []));
    setChatMessages([]);
    setChatText('');
  }, [openCourse?.id]);

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
    if (!newCourse.title) return;
    setBusy(true);
    try {
      const { data, error } = await createCourse({
        module_id: Number(id),
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

  const onGenerateCourse = async () => {
    if (!aiPrompt.trim()) return;
    setAiBusy(true);
    setAiError('');
    try {
      const course = await generateCourseDraft({
        moduleName: mod?.name,
        request: aiPrompt.trim(),
        provider: chatModel,
      });
      setNewCourse({
        title: course.title || '',
        content: course.content || '',
      });
      toast.success('Course draft generated');
    } catch (err) {
      setAiError(err.message);
      toast.error('AI setup needs attention');
    }
    setAiBusy(false);
  };

  const saveGeminiKey = () => {
    const key = geminiKeyInput.trim();
    if (!key) return;
    localStorage.setItem('gemini_api_key', key);
    setGeminiKeyInput('');
    setAiError('');
    setChatError('');
    toast.success('Gemini key saved');
  };

  const saveOpenRouterKey = () => {
    const key = openRouterKeyInput.trim();
    if (!key) return;
    localStorage.setItem('openrouter_api_key', key);
    setOpenRouterKeyInput('');
    setAiError('');
    setChatError('');
    toast.success('OpenRouter key saved');
  };

  const onUpdateModule = async (e) => {
    e.preventDefault();
    if (!moduleName.trim()) return;
    setBusy(true);
    try {
      const { error } = await updateModule(id, { name: moduleName.trim() });
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
      const up = await uploadFile('course-files', f);
      const { error } = await createAttachment({ course_id: courseId, file_path: up.path, file_name: up.name });
      if (error) throw error;
      toast.success('File uploaded');
      if (openCourse?.id === courseId) {
        const { data } = await listAttachments({ courseId });
        setAttach(data || []);
      }
    } catch (err) { toast.error(err.message); }
    setBusy(false);
    e.target.value = '';
  };

  const onRemoveAttach = async (aid) => {
    if (!confirm('Remove this attachment?')) return;
    const { error } = await deleteAttachment(aid);
    if (error) {
      toast.error(error.message);
      return;
    }
    setAttach(prev => prev.filter(x => x.id !== aid));
    toast.success('Attachment removed');
  };

  const askCourse = async (mode = 'chat') => {
    if (!openCourse) return;
    if (mode === 'chat' && !chatText.trim()) return;
    const question = chatText.trim();
    setChatBusy(true);
    setChatError('');
    if (mode === 'chat') {
      setChatMessages(prev => [...prev, { role: 'student', text: question }]);
      setChatText('');
    }
    try {
      const answer = await chatWithCourse({
        mode,
        question,
        course: {
          title: openCourse.title,
          content: openCourse.content || '',
          yt_url: openCourse.yt_url || firstYoutubeLink(openCourse.content) || '',
        },
        provider: chatModel,
      });

      setChatMessages(prev => [...prev, { role: 'assistant', text: answer }]);
    } catch (err) {
      setChatError(err.message);
      toast.error('AI setup needs attention');
    }
    setChatBusy(false);
  };

  const startLive = async () => {
    router.push(`/live?module=${id}`);
  };

  const stopLive = async () => {
    if (!live) return;
    setBusy(true);
    await endLivestream(live.id).catch(() => {});
    await fetch('/api/end-live', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module_id: Number(id) }),
    }).catch(() => {});
    toast.success('Live session ended');
    setBusy(false);
    refresh();
  };

  const openAndScroll = (c) => {
    setOpenCourse(c);
    setTimeout(() => playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  if (loading) {
    return (
      <Layout>
        <div className="page-header"><div className="skel" style={{ width: 120, height: 14 }} /></div>
        <div className="grid auto">
          {[0, 1, 2].map(i => <div key={i} className="skel-card"><div className="skel" style={{ width: 80, height: 14 }} /><div className="skel" style={{ width: 160, height: 18 }} /></div>)}
        </div>
      </Layout>
    );
  }
  if (!mod) return <Layout><div className="empty">Module not found.</div></Layout>;

  const embed = ytEmbed(openCourse?.yt_url || firstYoutubeLink(openCourse?.content));

  return (
    <Layout>
      <div className="page-header">
        <div className="crumb"><Link href="/browse">Browse</Link> / {mod.semester_label}</div>
        <div className="row between">
          <h1>{mod.name}</h1>
          <div className="row">
            {live && <span className="pill live">Live</span>}
            {live && !canManage && (
              <Link href={`/live?module=${id}`} className="btn live">Join live</Link>
            )}
            {live && canManage && (
              <>
                <Link href={`/live?module=${id}`} className="btn live">Open</Link>
                <button className="btn ghost sm" onClick={stopLive} disabled={busy}>End</button>
              </>
            )}
            {!live && canStartLive && (
              <button className="btn live" onClick={startLive} disabled={busy}>
                {busy ? 'Starting…' : 'Go live'}
              </button>
            )}
          </div>
        </div>
        <p className="sub">{mod.owner_name || 'Unassigned'} · {courses.length} {courses.length === 1 ? 'course' : 'courses'}</p>
        {canManage && (
          <div style={{ marginTop: 12 }}>
            {editingModule ? (
              <form className="row" onSubmit={onUpdateModule} style={{ gap: 8, flexWrap: 'wrap' }}>
                <input className="input" value={moduleName} onChange={e => setModuleName(e.target.value)} style={{ maxWidth: 320 }} />
                <button className="btn sm" disabled={busy}>Save</button>
                <button type="button" className="btn ghost sm" onClick={() => { setEditingModule(false); setModuleName(mod.name); }}>Cancel</button>
              </form>
            ) : (
              <button className="btn ghost sm" onClick={() => setEditingModule(true)}>Rename module</button>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 28 }}>
        <div>
          <div className="row between" style={{ marginBottom: 12 }}>
            <h2>Courses</h2>
            {canManage && !showAdd && (
              <button className="btn sm" onClick={() => setShowAdd(true)}>Add course</button>
            )}
          </div>

          {showAdd && (
            <form className="card" onSubmit={onAddCourse} style={{ marginBottom: 20, border: '1px solid var(--ink)' }}>
              <div className="row between" style={{ marginBottom: 12 }}>
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
              <div className="field">
                <div className="row between">
                  <label>AI course generator</label>
                  <div className="row" style={{ gap: 6 }}>
                    <button 
                      type="button"
                      className={`btn ghost xs ${chatModel === 'google' ? 'active' : ''}`}
                      onClick={() => setChatModel('google')}
                      style={{ padding: '2px 6px', fontSize: 10, background: chatModel === 'google' ? 'var(--ink)' : 'transparent', color: chatModel === 'google' ? 'white' : 'inherit' }}
                    >
                      Google
                    </button>
                    <button 
                      type="button"
                      className={`btn ghost xs ${chatModel === 'openrouter' ? 'active' : ''}`}
                      onClick={() => setChatModel('openrouter')}
                      style={{ padding: '2px 6px', fontSize: 10, background: chatModel === 'openrouter' ? 'var(--ink)' : 'transparent', color: chatModel === 'openrouter' ? 'white' : 'inherit' }}
                    >
                      Gemma
                    </button>
                  </div>
                </div>
                <textarea
                  className="textarea"
                  placeholder="Example: Create a beginner lesson about matrix multiplication with examples and exercises."
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                />
                <button type="button" className="btn ghost sm" onClick={onGenerateCourse} disabled={aiBusy || !aiPrompt.trim()}>
                  {aiBusy ? 'Generating...' : 'Generate draft'}
                </button>
                {aiError && (
                  <div className="form-error">
                    <div>{aiError}</div>
                    <div className="row" style={{ marginTop: 8, gap: 6 }}>
                      <input
                        className="input"
                        placeholder="Gemini API Key"
                        value={geminiKeyInput}
                        onChange={e => setGeminiKeyInput(e.target.value)}
                      />
                      <button type="button" className="btn sm" onClick={saveGeminiKey} disabled={!geminiKeyInput.trim()}>
                        Save
                      </button>
                    </div>
                    <div className="row" style={{ marginTop: 8, gap: 6 }}>
                      <input
                        className="input"
                        placeholder="OpenRouter API Key (fallback)"
                        value={openRouterKeyInput}
                        onChange={e => setOpenRouterKeyInput(e.target.value)}
                      />
                      <button type="button" className="btn sm" onClick={saveOpenRouterKey} disabled={!openRouterKeyInput.trim()}>
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button className="btn" type="submit" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
                {busy ? 'Adding...' : 'Create Course'}
              </button>
            </form>
          )}

          {courses.length === 0 ? (
            <div className="empty">No courses uploaded yet.</div>
          ) : courses.map(c => (
            <div key={c.id}>
              {editing?.id === c.id ? (
                <form className="card" onSubmit={onUpdateCourse} style={{ marginBottom: 12, padding: 12 }}>
                  <div className="field">
                    <input className="input sm" value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} />
                  </div>
                  <div className="field">
                    <textarea
                      className="textarea"
                      placeholder="Course content..."
                      value={editing.content || ''}
                      onChange={e => setEditing({ ...editing, content: e.target.value })}
                    />
                  </div>
                  <div className="row">
                    <button className="btn sm" type="submit">Save</button>
                    <button className="btn ghost sm" type="button" onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <div
                  className="course-row"
                  style={openCourse?.id === c.id ? { borderColor: 'var(--ink)', boxShadow: '0 0 0 3px rgba(10,10,10,0.04)' } : null}
                >
                  <div className="left" style={{ cursor: 'pointer' }} onClick={() => openAndScroll(c)}>
                    <div className="ic">{(c.yt_url || firstYoutubeLink(c.content)) ? '▶' : '📄'}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{c.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                        {c.attachment_count || 0} {c.attachment_count === 1 ? 'file' : 'files'}
                      </div>
                    </div>
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    {user && (
                      <button className={`fav ${favs.has(c.id) ? 'on' : ''}`} onClick={() => star(c.id)} aria-label="Favorite">
                        {favs.has(c.id) ? '★' : '☆'}
                      </button>
                    )}
                    {canManage && (
                      <>
                        <button className="btn ghost sm" onClick={() => setEditing(c)}>Edit</button>
                        <button className="btn ghost sm" onClick={() => onDeleteCourse(c.id)} style={{ color: 'var(--danger)' }}>Delete</button>
                      </>
                    )}
                    <button className="btn ghost sm" onClick={() => openAndScroll(c)}>Open</button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {openCourse && (
            <>
              <div className="divider" />
              <div ref={playerRef}>
                <div className="row between" style={{ marginBottom: 12 }}>
                  <h2 style={{ margin: 0 }}>{openCourse.title}</h2>
                </div>
                {embed ? (
                  <iframe
                    src={embed}
                    style={{ width: '100%', aspectRatio: '16/9', border: 0, borderRadius: 'var(--radius)' }}
                    allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div style={{
                    aspectRatio: '16 / 9', background: '#0a0a0a',
                    borderRadius: 'var(--radius)', display: 'grid', placeItems: 'center',
                    color: '#525252', fontSize: 13,
                  }}>
                    No video — see attachments
                  </div>
                )}
                {openCourse.content && (
                  <div className="course-content">
                    {openCourse.content}
                  </div>
                )}
                {attach.length > 0 && (
                  <div className="inline-files">
                    {attach.map(a => <AttachmentPreview key={a.id} attachment={a} />)}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="row between" style={{ marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>
                Files
                {openCourse && <span style={{ fontWeight: 400, color: 'var(--ink-3)', fontSize: 12, marginLeft: 6 }}>· {openCourse.title}</span>}
              </h3>
              {canManage && openCourse && (
                <label className="btn ghost sm" style={{ cursor: 'pointer' }}>
                  Add
                  <input type="file" hidden onChange={e => onFileUpload(e, openCourse.id)} />
                </label>
              )}
            </div>
            {attach.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>No files for this course.</div>
            ) : attach.map(a => (
              <div key={a.id} className="attach">
                <div className="name" title={a.file_name}>{a.file_name}</div>
                <div className="row" style={{ gap: 4 }}>
                  <a className="btn ghost sm" href={publicUrl('course-files', a.file_path)} target="_blank" rel="noreferrer">
                    ↓
                  </a>
                  {canManage && (
                    <button className="btn ghost sm" onClick={() => onRemoveAttach(a.id)} style={{ color: 'var(--danger)' }}>×</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 8 }}>About</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>
              {mod.semester_label} · taught by {mod.owner_name || 'Unassigned'}.
            </p>
          </div>

          {openCourse && !canManage && (
            <div className="card course-ai">
              <div className="row between" style={{ marginBottom: 10 }}>
                <div className="column">
                  <h3 style={{ margin: 0 }}>Course assistant</h3>
                  <div className="row" style={{ gap: 8, marginTop: 4 }}>
                    <button 
                      className={`btn ghost xs ${chatModel === 'google' ? 'active' : ''}`}
                      onClick={() => setChatModel('google')}
                      style={{ padding: '2px 6px', fontSize: 10, background: chatModel === 'google' ? 'var(--ink)' : 'transparent', color: chatModel === 'google' ? 'white' : 'inherit' }}
                    >
                      Google
                    </button>
                    <button 
                      className={`btn ghost xs ${chatModel === 'openrouter' ? 'active' : ''}`}
                      onClick={() => setChatModel('openrouter')}
                      style={{ padding: '2px 6px', fontSize: 10, background: chatModel === 'openrouter' ? 'var(--ink)' : 'transparent', color: chatModel === 'openrouter' ? 'white' : 'inherit' }}
                    >
                      Gemma
                    </button>
                  </div>
                </div>
                <button className="btn ghost sm" onClick={() => askCourse('summary')} disabled={chatBusy}>
                  Summarize
                </button>
              </div>
              <div className="course-ai-body">
                {chatMessages.length === 0 ? (
                  <div className="empty" style={{ padding: 16 }}>
                    {chatError || 'Ask about this course or summarize it.'}
                    {chatError && (
                      <div className="column" style={{ marginTop: 10, gap: 6 }}>
                        <div className="row" style={{ gap: 6 }}>
                          <input
                            className="input"
                            placeholder="Gemini API Key"
                            value={geminiKeyInput}
                            onChange={e => setGeminiKeyInput(e.target.value)}
                          />
                          <button type="button" className="btn sm" onClick={saveGeminiKey} disabled={!geminiKeyInput.trim()}>
                            Save
                          </button>
                        </div>
                        <div className="row" style={{ gap: 6 }}>
                          <input
                            className="input"
                            placeholder="OpenRouter API Key (fallback)"
                            value={openRouterKeyInput}
                            onChange={e => setOpenRouterKeyInput(e.target.value)}
                          />
                          <button type="button" className="btn sm" onClick={saveOpenRouterKey} disabled={!openRouterKeyInput.trim()}>
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : chatMessages.map((m, i) => (
                  <div key={i} className={`ai-msg ${m.role}`}>
                    {m.text}
                  </div>
                ))}
                {chatBusy && <div className="ai-msg assistant">Thinking...</div>}
                {chatError && chatMessages.length > 0 && <div className="form-error">{chatError}</div>}
              </div>
              <form className="chat-input" onSubmit={(e) => { e.preventDefault(); askCourse('chat'); }}>
                <input
                  placeholder="Ask about this course..."
                  value={chatText}
                  onChange={e => setChatText(e.target.value)}
                  disabled={chatBusy}
                />
                <button className="btn sm" disabled={chatBusy || !chatText.trim()}>Ask</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
