import Layout from '../components/Layout';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listSemesters, listModulesBySemester } from '../lib/db';

export default function Browse() {
  const [semesters, setSemesters] = useState([]);
  const [active, setActive] = useState(null);
  const [modules, setModules] = useState([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    listSemesters().then(({ data }) => {
      setSemesters(data || []);
      if (data?.[0]) setActive(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!active) return;
    listModulesBySemester(active).then(({ data }) => setModules(data || []));
  }, [active]);

  const grouped = semesters.reduce((acc, s) => {
    acc[s.level] = acc[s.level] || {};
    acc[s.level][s.year_code] = acc[s.level][s.year_code] || [];
    acc[s.level][s.year_code].push(s);
    return acc;
  }, {});

  const filtered = modules.filter(m => m.name?.toLowerCase().includes(q.toLowerCase()));

  return (
    <Layout>
      <div className="page-header">
        <div className="crumb">Catalog</div>
        <h1>Browse</h1>
        <p className="sub">Explore semesters, modules, and courses.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 28 }}>
        <div>
          {Object.entries(grouped).map(([level, years]) => (
            <div key={level} style={{ marginBottom: 18 }}>
              <div className="nav-section" style={{ padding: '0 0 6px' }}>{level}</div>
              {Object.entries(years).map(([year, sems]) => (
                <div key={year} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', padding: '6px 0' }}>{year}</div>
                  {sems.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setActive(s.id)}
                      className={`nav-item ${active === s.id ? 'active' : ''}`}
                      style={{ width: '100%', border: 'none', background: active === s.id ? 'var(--ink)' : 'transparent', textAlign: 'left' }}
                    >
                      {s.semester_code}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div>
          <div className="row between" style={{ marginBottom: 14 }}>
            <h2>Modules</h2>
            <input
              className="input"
              placeholder="Search modules…"
              style={{ maxWidth: 260 }}
              value={q} onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {filtered.length === 0 ? (
            <div className="empty">No modules in this semester yet.</div>
          ) : (
            <div className="grid auto">
              {filtered.map(m => (
                <Link key={m.id} href={`/module?id=${m.id}`} className="card hover click module-card">
                  <div className="title">{m.name}</div>
                  <div className="meta">
                    {m.owner_name || 'Unassigned'} · {m.course_count || 0} courses
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
