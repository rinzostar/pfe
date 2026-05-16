import Layout from '../../components/Layout';
import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import {
  listFaculties, listDepartments, listLevels, listYears, listSemesters,
  createFaculty, deleteFaculty,
  createDepartment, deleteDepartment,
  createLevel, deleteLevel,
  createYear, deleteYear,
  createSemester, deleteSemester,
} from '../../lib/db';
import { toast } from '../../lib/toast';
import FadeIn from '../../components/FadeIn';

const EMOJIS = ['🔬', '🏥', '⚖️', '⚙️', '💻', '📐', '⚛️', '🧪', '🩺', '🔪', '📜', '📋', '🏗️', '⚡', '📚', '🎓'];
const GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
];

export default function AdminStructure() {
  const { user } = useAuth();
  const [step, setStep] = useState('faculty');
  const [data, setData] = useState({ faculties: [], departments: [], levels: [], years: [], semesters: [] });
  const [selections, setSelections] = useState({ faculty: null, department: null, level: null, year: null });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [f, d, l, y, s] = await Promise.all([
      listFaculties(),
      listDepartments(),
      listLevels(),
      listYears(),
      listSemesters(),
    ]);
    setData({
      faculties: f.data || [],
      departments: d.data || [],
      levels: l.data || [],
      years: y.data || [],
      semesters: s.data || [],
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const select = (key, value) => {
    const next = { ...selections, [key]: value };
    setSelections(next);
    if (key === 'faculty') { setStep('department'); setShowForm(false); }
    else if (key === 'department') { setStep('level'); setShowForm(false); }
    else if (key === 'level') { setStep('year'); setShowForm(false); }
    else if (key === 'year') { setStep('semester'); setShowForm(false); }
  };

  const goBack = (targetStep) => {
    const steps = ['faculty', 'department', 'level', 'year', 'semester'];
    const idx = steps.indexOf(targetStep);
    const nextSel = {};
    for (let i = 0; i <= idx; i++) nextSel[steps[i]] = selections[steps[i]];
    setSelections(nextSel);
    setStep(targetStep);
    setShowForm(false);
  };

  const breadcrumbs = [
    { key: 'faculty', label: selections.faculty?.name || 'Faculties' },
    { key: 'department', label: selections.department?.name || 'Departments' },
    { key: 'level', label: selections.level?.name || 'Levels' },
    { key: 'year', label: selections.year?.name || 'Years' },
    { key: 'semester', label: selections.year ? 'Semesters' : 'Semesters' },
  ];

  const visibleBreadcrumbs = breadcrumbs.filter((b, i) => {
    const steps = ['faculty', 'department', 'level', 'year', 'semester'];
    return selections[b.key] || steps.indexOf(b.key) <= steps.indexOf(step);
  });

  const getItems = () => {
    if (step === 'faculty') return data.faculties;
    if (step === 'department') return data.departments.filter(d => d.facultyId === selections.faculty?.id);
    if (step === 'level') return data.levels;
    if (step === 'year') return data.years.filter(y => y.levelId === selections.level?.id);
    if (step === 'semester') return data.semesters.filter(s => s.yearId === selections.year?.id);
    return [];
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      if (step === 'faculty') {
        await createFaculty({ name: form.name, icon: form.icon || '📁', color: form.color || GRADIENTS[0] });
      } else if (step === 'department') {
        await createDepartment({ name: form.name, facultyId: selections.faculty.id, icon: form.icon || '📁' });
      } else if (step === 'level') {
        await createLevel({ name: form.name, code: form.code || 'L', icon: form.icon || '📚' });
      } else if (step === 'year') {
        await createYear({ levelId: selections.level.id, code: form.code, name: form.name });
      } else if (step === 'semester') {
        await createSemester({ yearId: selections.year.id, code: form.code, label: form.label || `${form.code} · ${selections.year?.code}` });
      }
      toast.success('Created');
      setForm({});
      setShowForm(false);
      await load();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (id, type) => {
    if (!confirm('Delete this item? This may affect related data.')) return;
    try {
      if (type === 'faculty') await deleteFaculty(id);
      else if (type === 'department') await deleteDepartment(id);
      else if (type === 'level') await deleteLevel(id);
      else if (type === 'year') await deleteYear(id);
      else if (type === 'semester') await deleteSemester(id);
      toast.success('Deleted');
      await load();
    } catch (err) { toast.error(err.message); }
  };

  const getTitle = () => {
    if (step === 'faculty') return 'Faculties';
    if (step === 'department') return `Departments in ${selections.faculty?.name}`;
    if (step === 'level') return 'Levels';
    if (step === 'year') return `Years in ${selections.level?.name}`;
    if (step === 'semester') return `Semesters in ${selections.year?.name}`;
    return '';
  };

  return (
    <Layout>
      <FadeIn>
        <div className="page-header">
          <div className="crumb">Administration</div>
          <h1>Structure</h1>
          <p className="sub">Manage faculties, departments, levels, years, and semesters.</p>
        </div>
      </FadeIn>

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

      {loading ? (
        <div className="grid auto">
          {[0, 1, 2, 3].map(i => <div key={i} className="skel-card" />)}
        </div>
      ) : (
        <>
          <FadeIn delay={120}>
            <div className="row between" style={{ marginBottom: 18 }}>
              <h2>{getTitle()}</h2>
              <button className="btn" onClick={() => setShowForm(s => !s)}>+ Add</button>
            </div>
          </FadeIn>

          {showForm && (
            <FadeIn delay={100}>
              <form className="card" onSubmit={handleCreate} style={{ marginBottom: 24, maxWidth: 480 }}>
                <h3 style={{ marginBottom: 14 }}>Add new {step}</h3>
                <div className="field">
                  <label>Name</label>
                  <input className="input" required value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                {(step === 'faculty' || step === 'department' || step === 'level') && (
                  <div className="field">
                    <label>Icon (emoji)</label>
                    <input className="input" value={form.icon || ''} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="🔬" />
                  </div>
                )}
                {(step === 'faculty') && (
                  <div className="field">
                    <label>Color gradient</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {GRADIENTS.map((g, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setForm({ ...form, color: g })}
                          style={{
                            width: 36, height: 36, borderRadius: 8, background: g,
                            border: form.color === g ? '3px solid var(--ink)' : '3px solid transparent',
                            cursor: 'pointer',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {(step === 'level') && (
                  <div className="field">
                    <label>Code (L, M, D)</label>
                    <input className="input" required value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="L" />
                  </div>
                )}
                {(step === 'year') && (
                  <>
                    <div className="field">
                      <label>Code</label>
                      <input className="input" required value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="L1" />
                    </div>
                    <div className="field">
                      <label>Full name</label>
                      <input className="input" required value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="1ère Année Licence" />
                    </div>
                  </>
                )}
                {(step === 'semester') && (
                  <>
                    <div className="field">
                      <label>Code</label>
                      <input className="input" required value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="S1" />
                    </div>
                    <div className="field">
                      <label>Label</label>
                      <input className="input" value={form.label || ''} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="S1 · L1" />
                    </div>
                  </>
                )}
                <div className="row" style={{ gap: 8, marginTop: 14 }}>
                  <button className="btn" type="submit">Create</button>
                  <button className="btn ghost" type="button" onClick={() => setShowForm(false)}>Cancel</button>
                </div>
              </form>
            </FadeIn>
          )}

          <FadeIn delay={150}>
            <div className="hierarchy-grid">
              {getItems().map(item => (
                <div key={item.id} className="card hover" style={{ cursor: 'pointer' }} onClick={() => {
                  if (step === 'faculty') select('faculty', item);
                  else if (step === 'department') select('department', item);
                  else if (step === 'level') select('level', item);
                  else if (step === 'year') select('year', item);
                }}>
                  <div className="row between">
                    <div style={{ fontSize: 28 }}>{item.icon || '📁'}</div>
                    <button
                      className="btn ghost xs"
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id, step); }}
                      style={{ color: 'var(--danger)' }}
                    >🗑️</button>
                  </div>
                  <div className="title" style={{ marginTop: 10 }}>{item.name}</div>
                  <div className="meta">{item.code || (item.label ? item.label.split('·')[1]?.trim() : '')}</div>
                </div>
              ))}
              {getItems().length === 0 && !showForm && (
                <div className="empty" style={{ gridColumn: '1/-1' }}>
                  <span className="empty-icon">📋</span>
                  <div>No {step}s yet</div>
                </div>
              )}
            </div>
          </FadeIn>
        </>
      )}
    </Layout>
  );
}