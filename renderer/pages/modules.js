import Layout from '../components/Layout';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import { listMyModules, listModulesByDepartment, createAccessRequest, listAccessRequests, createCourse } from '../lib/db';
import { toast } from '../lib/toast';
import FadeIn from '../components/FadeIn';

export default function MyModules() {
  const router = useRouter();
  const { user } = useAuth();
  const canTeach = user?.role === 'professor' || user?.role === 'admin';
  const [mods, setMods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [adder, setAdder] = useState(null);
  const [yt, setYt] = useState({ title: '', url: '' });
  const [browseMode, setBrowseMode] = useState(false);
  const [availableModules, setAvailableModules] = useState([]);
  const [pendingRequests, setPendingRequests] = useState(new Set());
  const [selectedModule, setSelectedModule] = useState(null);

  const refresh = async () => {
    if (!user || !canTeach) {
      setMods([]);
      setLoading(false);
      return;
    }
    const { data } = await listMyModules(user.id);
    setMods(data || []);

    const { data: reqs } = await listAccessRequests();
    const myPending = (reqs || []).filter(r => r.professorId === user.id && r.status === 'pending').map(r => r.moduleId);
    setPendingRequests(new Set(myPending));
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user?.id, canTeach]);

  const goLive = (mid) => {
    router.push(`/live?module=${String(mid)}`);
  };

  const requestAccess = async (m) => {
    try {
      await createAccessRequest({
        professorId: user.id,
        professor_name: user.name,
        moduleId: m.id || m._id,
        module_name: m.name,
      });
      setPendingRequests(prev => new Set([...prev, m.id || m._id]));
      toast.success('Demande envoyée! L\'admin va la审查.');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const addYoutube = async () => {
    if (!yt.title || !yt.url || !adder?.moduleId) return;
    setBusy('yt');
    try {
      await createCourse({
        moduleId: adder.moduleId,
        title: yt.title,
        yt_url: yt.url,
      });
      setYt({ title: '', url: '' });
      setAdder(null);
      toast.success('Course added');
      await refresh();
    } catch (err) { toast.error(err.message); }
    setBusy(null);
  };

  const onFile = async (e, mid) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy('up-' + mid);
    toast.success(`Uploading ${f.name}...`);
    await refresh();
    setBusy(null);
    e.target.value = '';
  };

  const getModId = (m) => m.id || m._id;

  const browseModules = async () => {
    setBrowseMode(true);
    const { data } = await listModulesByDepartment('all');
    const myModIds = new Set(mods.map(m => getModId(m)));
    const approvedIds = pendingRequests;
    setAvailableModules((data || []).filter(m => !myModIds.has(getModId(m)) && !approvedIds.has(getModId(m))));
  };

  return (
    <Layout>
      <FadeIn>
        <div className="page-header">
          <div className="crumb">Teaching</div>
          <h1>My modules</h1>
          <p className="sub">Manage courses, files and live sessions.</p>
        </div>
      </FadeIn>

      {loading ? (
        <div className="grid auto">
          {[0, 1, 2].map(i => <div key={i} className="skel-card"><div className="skel" style={{ width: 100, height: 16 }} /><div className="skel" style={{ width: 180, height: 22 }} /></div>)}
        </div>
      ) : !canTeach ? (
        <div className="empty">Teaching tools are only available for professors.</div>
      ) : browseMode ? (
        <div>
          <div className="row between" style={{ marginBottom: 20 }}>
            <h2>Available modules</h2>
            <button className="btn ghost" onClick={() => setBrowseMode(false)}>← Back</button>
          </div>
          {availableModules.length === 0 ? (
            <div className="empty">No modules available to request.</div>
          ) : (
            <div className="grid auto">
              {availableModules.map((m, i) => (
                <FadeIn key={getModId(m)} delay={i * 60}>
                  <div className="card hover module-card">
                    <div className="pill gradient-3">{m.semester_label}</div>
                    <div className="title" style={{ marginTop: 14 }}>{m.name}</div>
                    <div className="meta">{m.owner_name} · {m.course_count || 0} courses</div>
                    <button
                      className="btn"
                      style={{ marginTop: 14, width: '100%' }}
                      onClick={() => requestAccess(m)}
                    >
                      📚 Demander accès
                    </button>
                  </div>
                </FadeIn>
              ))}
            </div>
          )}
        </div>
      ) : mods.length === 0 ? (
        <div className="empty">
          <span className="empty-icon">📦</span>
          <div style={{ fontSize: 18, fontWeight: 800 }}>You don't own any modules yet.</div>
          <div style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 600, marginTop: 8 }}>
            <button className="btn" onClick={browseModules} style={{ marginTop: 10 }}>Browse available modules</button>
          </div>
        </div>
      ) : (
        <div>
          <div className="row between" style={{ marginBottom: 20 }}>
            <div />
            <button className="btn ghost" onClick={browseModules}>+ Browse more modules</button>
          </div>
          <div className="grid auto">
            {mods.map((m, i) => (
              <FadeIn key={getModId(m)} delay={i * 80}>
                <div className="card hover module-card">
                  <div className="row between">
                    <div className="pill gradient-3">{m.semester_label}</div>
                    <button className="btn live sm" onClick={() => goLive(getModId(m))} disabled={busy === 'live-' + getModId(m)}>
                      {busy === 'live-' + getModId(m) ? '…' : 'Go live'}
                    </button>
                  </div>
                  <div className="title" style={{ marginTop: 14 }}>{m.name}</div>
                  <div className="meta">{m.course_count || 0} {m.course_count === 1 ? 'course' : 'courses'}</div>
                  <div className="row" style={{ marginTop: 16, gap: 10, flexWrap: 'wrap' }}>
                    <Link href={`/module?id=${getModId(m)}`} className="btn ghost sm">Open</Link>
                    <label className="btn ghost sm" style={{ cursor: 'pointer' }}>
                      {busy === 'up-' + getModId(m) ? 'Uploading…' : 'Upload'}
                      <input type="file" hidden onChange={(e) => onFile(e, getModId(m))} />
                    </label>
                    <button className="btn ghost sm" onClick={() => setAdder({ moduleId: getModId(m) })}>+ YouTube</button>
                  </div>

                  {adder?.moduleId === getModId(m) && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                      <div className="field">
                        <label>Title</label>
                        <input className="input" value={yt.title} onChange={(e) => setYt({ ...yt, title: e.target.value })} autoFocus />
                      </div>
                      <div className="field">
                        <label>YouTube URL</label>
                        <input className="input" value={yt.url} onChange={(e) => setYt({ ...yt, url: e.target.value })} placeholder="https://youtube.com/..." />
                      </div>
                      <div className="row">
                        <button className="btn sm" onClick={addYoutube} disabled={busy === 'yt'}>Add</button>
                        <button className="btn ghost sm" onClick={() => { setAdder(null); setYt({ title: '', url: '' }); }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}
