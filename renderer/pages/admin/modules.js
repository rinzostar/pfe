import Layout from '../../components/Layout';
import { useEffect, useState } from 'react';
import { listAdminModules } from '../../lib/db';
import FadeIn from '../../components/FadeIn';

export default function AdminModules() {
  const [mods, setMods] = useState([]);

  const refresh = async () => {
    const { data } = await listAdminModules();
    const norm = (data || []).map(x => ({
      ...x,
      semester_label: x.semester_label || x.semesters?.label,
      owner_name: x.owner_name || x.profiles?.name || 'Unassigned',
    }));
    setMods(norm);
  };
  useEffect(() => { refresh(); }, []);

  return (
    <Layout>
      <FadeIn>
        <div className="page-header">
          <div className="crumb">Administration</div>
          <h1>Modules</h1>
          <p className="sub">View all modules in the system.</p>
        </div>
      </FadeIn>

      <FadeIn delay={100}>
        <table className="table">
          <thead>
            <tr><th>Module</th><th>Semester</th><th>Owner</th></tr>
          </thead>
          <tbody>
            {mods.length === 0 ? (
              <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 24 }}>No modules yet.</td></tr>
            ) : mods.map(m => (
              <tr key={m.id}>
                <td style={{ fontWeight: 700 }}>{m.name}</td>
                <td><span className="pill gradient-3">{m.semester_label}</span></td>
                <td style={{ color: 'var(--ink-3)', fontWeight: 600 }}>{m.owner_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </FadeIn>
    </Layout>
  );
}