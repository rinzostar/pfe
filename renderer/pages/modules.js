import Layout from '../components/Layout';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import { listMyModules } from '../lib/db';
import { supabase, HAS_SUPABASE } from '../lib/supabase';
import { uploadFile } from '../lib/storage';
import { toast } from '../lib/toast';

export default function MyModules() {
  const router = useRouter();
  const { user } = useAuth();
  const canTeach = user?.role === 'professor' || user?.role === 'admin';
  const [mods, setMods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [adder, setAdder] = useState(null); // {moduleId}
  const [yt, setYt] = useState({ title: '', url: '' });

  const refresh = async () => {
    if (!user || !canTeach) {
      setMods([]);
      setLoading(false);
      return;
    }
    const { data } = await listMyModules(user.id);
    setMods(data || []);
    setLoading(false);
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user?.id, canTeach]);

  const goLive = (mid) => {
    router.push(`/live?module=${mid}`);
  };

  const addYoutube = async () => {
    if (!yt.title || !yt.url || !adder?.moduleId) return;
    setBusy('yt');
    try {
      if (HAS_SUPABASE) {
        const { error } = await supabase.from('courses').insert({
          module_id: adder.moduleId, title: yt.title, yt_url: yt.url,
        });
        if (error) throw error;
      }
      setYt({ title: '', url: '' });
      setAdder(null);
      await refresh();
      toast.success('Course added');
    } catch (err) { toast.error(err.message); }
    setBusy(null);
  };

  const onFile = async (e, mid) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy('up-' + mid);
    try {
      const up = await uploadFile('course-files', f);
      if (HAS_SUPABASE) {
        const { data: course, error } = await supabase
          .from('courses')
          .insert({ module_id: mid, title: f.name })
          .select().single();
        if (error) throw error;
        await supabase.from('attachments').insert({
          course_id: course.id, file_path: up.path, file_name: up.name,
        });
      }
      toast.success(`Uploaded ${f.name}`);
      await refresh();
    } catch (err) { toast.error(err.message); }
    setBusy(null);
    e.target.value = '';
  };

  return (
    <Layout>
      <div className="page-header">
        <div className="crumb">Teaching</div>
        <h1>My modules</h1>
        <p className="sub">Manage courses, files and live sessions.</p>
      </div>

      {loading ? (
        <div className="grid auto">
          {[0, 1, 2].map(i => <div key={i} className="skel-card"><div className="skel" style={{ width: 100, height: 14 }} /><div className="skel" style={{ width: 180, height: 18 }} /></div>)}
        </div>
      ) : !canTeach ? (
        <div className="empty">Teaching tools are only available for professors.</div>
      ) : mods.length === 0 ? (
        <div className="empty">You don't own any modules yet. Ask an admin to assign one.</div>
      ) : (
        <div className="grid auto">
          {mods.map(m => (
            <div key={m.id} className="card hover module-card">
              <div className="row between">
                <div className="pill">{m.semester_label}</div>
                <button className="btn live sm" onClick={() => goLive(m.id)} disabled={busy === 'live-' + m.id}>
                  {busy === 'live-' + m.id ? '…' : 'Go live'}
                </button>
              </div>
              <div className="title" style={{ marginTop: 12 }}>{m.name}</div>
              <div className="meta">{m.course_count || 0} {m.course_count === 1 ? 'course' : 'courses'}</div>
              <div className="row" style={{ marginTop: 14, gap: 8, flexWrap: 'wrap' }}>
                <Link href={`/module?id=${m.id}`} className="btn ghost sm">Open</Link>
                <label className="btn ghost sm" style={{ cursor: 'pointer' }}>
                  {busy === 'up-' + m.id ? 'Uploading…' : 'Upload'}
                  <input type="file" hidden onChange={(e) => onFile(e, m.id)} />
                </label>
                <button className="btn ghost sm" onClick={() => setAdder({ moduleId: m.id })}>+ YouTube</button>
              </div>

              {adder?.moduleId === m.id && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
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
          ))}
        </div>
      )}
    </Layout>
  );
}
