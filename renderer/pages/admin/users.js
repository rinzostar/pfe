import Layout from '../../components/Layout';
import { useEffect, useState } from 'react';
import { listUsers, setBanned, createUser } from '../../lib/db';
import { toast } from '../../lib/toast';
import Avatar from '../../components/Avatar';
import FadeIn from '../../components/FadeIn';

export default function AdminUsers() {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [form, setForm] = useState({ name: '', email: '', role: 'student', dob: '' });
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const { data } = await listUsers();
    setUsers(data || []);
  };
  useEffect(() => { refresh(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await createUser({
        email: form.email,
        password: form.dob + '_' + suffix,
        name: form.name,
        role: form.role,
      });
      if (error) throw error;
      toast.success('User created');
      setForm({ name: '', email: '', role: 'student', dob: '' });
      await refresh();
      setOpen(false);
    } catch (err) { toast.error(err.message); }
    setBusy(false);
  };

  const toggleBan = async (u) => {
    if (!u.banned && !confirm(`Ban ${u.name}?`)) return;
    await setBanned(u.id, !u.banned);
    toast.success(u.banned ? 'User unbanned' : 'User banned');
    await refresh();
  };

  const filtered = users.filter(u =>
    !q ||
    u.name?.toLowerCase().includes(q.toLowerCase()) ||
    u.email?.toLowerCase().includes(q.toLowerCase())
  );

  const suffix = form.role === 'professor' ? 'prof' : (form.role === 'admin' ? 'admin' : 'std');

  return (
    <Layout>
      <FadeIn>
        <div className="page-header">
          <div className="crumb">Administration</div>
          <div className="row between">
            <div>
              <h1>Users</h1>
              <p className="sub">{users.length} accounts · {users.filter(u => u.banned).length} banned</p>
            </div>
            <div className="row">
              <input
                className="input"
                placeholder="Search…"
                value={q} onChange={(e) => setQ(e.target.value)}
                style={{ width: 220 }}
              />
              <button className="btn" onClick={() => setOpen(!open)}>{open ? 'Cancel' : '+ New user'}</button>
            </div>
          </div>
        </div>
      </FadeIn>

      {open && (
        <FadeIn>
          <form className="card" style={{ marginBottom: 20 }} onSubmit={create}>
            <h3 style={{ marginBottom: 14, fontSize: 18 }}>Create account</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="field">
                <label>Full name</label>
                <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="field">
                <label>Email</label>
                <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="field">
                <label>Role</label>
                <select className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="student">Student</option>
                  <option value="professor">Professor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="field">
                <label>Date of birth (dd/mm/yyyy)</label>
                <input className="input" placeholder="01/01/2000" required value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 14, fontWeight: 600 }}>
              Password will be <span className="kbd">{form.dob || 'dd/mm/yyyy'}_{suffix}</span>
            </p>
            <div className="row">
              <button className="btn" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create'}</button>
              <button className="btn ghost" type="button" onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </form>
        </FadeIn>
      )}

      <FadeIn delay={100}>
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 30 }}>No users found.</td></tr>
            ) : filtered.map(u => (
              <tr key={u.id}>
                <td>
                  <div className="row" style={{ gap: 10 }}>
                    <Avatar name={u.name} id={u.id} size={32} fontSize={12} />
                    <span style={{ fontWeight: 700 }}>{u.name}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--ink-3)', fontWeight: 600 }}>{u.email}</td>
                <td><span className="pill gradient">{u.role}</span></td>
                <td>
                  {u.banned
                    ? <span className="pill" style={{ background: '#fee2e2', color: 'var(--danger)' }}>Banned</span>
                    : <span className="pill gradient-4">Active</span>}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn danger sm" onClick={() => toggleBan(u)}>
                    {u.banned ? 'Unban' : 'Ban'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </FadeIn>
    </Layout>
  );
}
