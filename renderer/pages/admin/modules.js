import Layout from '../../components/Layout';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { listAdminModules, listSemesters, listProfessors, createModule } from '../../lib/db';
import { toast } from '../../lib/toast';

export default function AdminModules() {
  const router = useRouter();
  const [mods, setMods] = useState([]);
  const [sems, setSems] = useState([]);
  const [profs, setProfs] = useState([]);
  const [form, setForm] = useState({ name: '', semester_id: '', owner_id: '' });
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const [m, s, p] = await Promise.all([listAdminModules(), listSemesters(), listProfessors()]);
    const norm = (m.data || []).map(x => ({
      ...x,
      semester_label: x.semester_label || x.semesters?.label,
      owner_name: x.owner_name || x.profiles?.full_name || 'Unassigned',
    }));
    setMods(norm);
    setSems(s.data || []);
    setProfs(p.data || []);
    if (s.data?.[0] && !form.semester_id) setForm(f => ({ ...f, semester_id: s.data[0].id }));
    if (p.data?.[0] && !form.owner_id) setForm(f => ({ ...f, owner_id: p.data[0].id }));
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await createModule({ name: form.name, semester_id: Number(form.semester_id), owner_id: form.owner_id });
      setForm(f => ({ ...f, name: '' }));
      toast.success('Module created');
      await refresh();
    } catch (err) { toast.error(err.message); }
    setBusy(false);
  };

  const goLive = async (mid) => {
    router.push(`/live?module=${mid}`);
  };

  return (
    <Layout>
      <div className="page-header">
        <div className="crumb">Administration</div>
        <h1>Modules</h1>
        <p className="sub">Create modules and assign professors.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 28 }}>
        <table className="table">
          <thead>
            <tr><th>Module</th><th>Semester</th><th>Owner</th><th></th></tr>
          </thead>
          <tbody>
            {mods.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 24 }}>No modules yet.</td></tr>
            ) : mods.map(m => (
              <tr key={m.id}>
                <td style={{ fontWeight: 500 }}>{m.name}</td>
                <td><span className="pill">{m.semester_label}</span></td>
                <td style={{ color: 'var(--ink-3)' }}>{m.owner_name}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn live sm" onClick={() => goLive(m.id)}>Go live</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <form className="card" onSubmit={add}>
          <h3 style={{ marginBottom: 12 }}>Add module</h3>
          <div className="field">
            <label>Name</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <label>Semester</label>
            <select className="select" value={form.semester_id} onChange={(e) => setForm({ ...form, semester_id: e.target.value })}>
              {sems.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Assign professor</label>
            <select className="select" value={form.owner_id} onChange={(e) => setForm({ ...form, owner_id: e.target.value })}>
              {profs.length === 0 ? <option value="">— no professors yet —</option>
                : profs.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
          <button className="btn" type="submit" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
            {busy ? 'Creating…' : 'Create module'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
