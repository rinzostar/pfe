import Layout from '../components/Layout';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  listFaculties, listDepartments, listLevels, listYears,
  listSemesters, listModulesBySemester, listCoursesByModule,
  createFaculty, createDepartment, createModule, createLevel, createYear, createSemester, createCourse,
} from '../lib/db';
import FadeIn from '../components/FadeIn';
import GradientCard from '../components/GradientCard';
import { toast } from '../lib/toast';
import { useAuth } from '../lib/auth';

export default function Browse() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [step, setStep] = useState('faculty'); // faculty, department, program, level, semester, subject
  const [selections, setSelections] = useState({});
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({});

  const GRADIENTS = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  ];

  const load = async (fn, ...args) => {
    setLoading(true);
    const { data } = await fn(...args);
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load(listFaculties);
  }, []);

  const select = (key, value) => {
    const next = { ...selections, [key]: value };
    setSelections(next);
    if (key === 'faculty') { setStep('department'); load(listDepartments, value.id); }
    else if (key === 'department') { setStep('program'); load(listLevels); }
    else if (key === 'program') { setStep('level'); load(listYears, value.id); }
    else if (key === 'level') { setStep('semester'); load(listSemesters, value.id); }
    else if (key === 'semester') { setStep('subject'); load(listModulesBySemester, value.id); }
    else if (key === 'subject') { setStep('course'); load(listCoursesByModule, value.id); }
  };

  const goBack = (targetStep) => {
    const steps = ['faculty', 'department', 'program', 'level', 'semester', 'subject', 'course'];
    const idx = steps.indexOf(targetStep);
    const nextSel = {};
    for (let i = 0; i <= idx; i++) nextSel[steps[i]] = selections[steps[i]];
    setSelections(nextSel);
    setStep(targetStep);
    if (targetStep === 'faculty') load(listFaculties);
    else if (targetStep === 'department') load(listDepartments, nextSel.faculty.id);
    else if (targetStep === 'program') load(listLevels);
    else if (targetStep === 'level') load(listYears, nextSel.program.id);
    else if (targetStep === 'semester') load(listSemesters, nextSel.level.id);
    else if (targetStep === 'subject') load(listModulesBySemester, nextSel.semester.id);
    else if (targetStep === 'course') load(listCoursesByModule, nextSel.subject.id);
  };

  const breadcrumbs = [
    { key: 'faculty', label: selections.faculty?.name || 'Faculties' },
    { key: 'department', label: selections.department?.name || 'Departments' },
    { key: 'program', label: selections.program?.name || 'Programs' },
    { key: 'level', label: selections.level?.name || 'Levels' },
    { key: 'semester', label: selections.semester?.name || 'Semesters' },
    { key: 'subject', label: selections.subject?.name || 'Subjects' },
    { key: 'course', label: 'Courses' },
  ];

  const visibleBreadcrumbs = breadcrumbs.filter((b, i) => {
    const steps = ['faculty', 'department', 'program', 'level', 'semester', 'subject', 'course'];
    return selections[b.key] || steps.indexOf(b.key) <= steps.indexOf(step);
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      if (step === 'faculty') {
        await createFaculty({ name: form.name, icon: form.icon || '📁', color: form.color || GRADIENTS[0] });
        await load(listFaculties);
      } else if (step === 'department') {
        await createDepartment({ name: form.name, facultyId: selections.faculty.id, icon: form.icon || '📁' });
        await load(listDepartments, selections.faculty.id);
      } else if (step === 'program') {
        await createLevel({ name: form.name, code: form.code || 'P', icon: form.icon || '📚' });
        await load(listLevels);
      } else if (step === 'level') {
        await createYear({ levelId: selections.program.id, code: form.code, name: form.name });
        await load(listYears, selections.program.id);
      } else if (step === 'semester') {
        await createSemester({ yearId: selections.level.id, code: form.code, label: form.label || `${form.code}` });
        await load(listSemesters, selections.level.id);
      } else if (step === 'subject') {
        await createModule({ name: form.name, semesterId: selections.semester.id, departmentId: selections.department.id, ownerId: user?.id });
        await load(listModulesBySemester, selections.semester.id);
      } else if (step === 'course') {
        await createCourse({ moduleId: selections.subject.id, title: form.name, content: form.content || '' });
        await load(listCoursesByModule, selections.subject.id);
      }
      toast.success('Created');
      setForm({});
      setShowForm(false);
    } catch (err) { toast.error(err.message); }
  };

  const renderForm = () => (
    <form className="card" onSubmit={handleCreate} style={{ marginBottom: 24, maxWidth: 480 }}>
      <h3 style={{ marginBottom: 14 }}>Add new {step}</h3>
      <div className="field">
        <label>Name</label>
        <input className="input" required value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
      </div>
      {(step === 'faculty' || step === 'department' || step === 'program') && (
        <div className="field">
          <label>Icon (emoji)</label>
          <input className="input" value={form.icon || ''} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="📁" />
        </div>
      )}
      {step === 'faculty' && (
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
      {step === 'program' && (
        <div className="field">
          <label>Code</label>
          <input className="input" required value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="P1" />
        </div>
      )}
      {step === 'level' && (
        <>
          <div className="field">
            <label>Code</label>
            <input className="input" required value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="L1" />
          </div>
        </>
      )}
      {step === 'semester' && (
        <>
          <div className="field">
            <label>Code</label>
            <input className="input" required value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="S1" />
          </div>
          <div className="field">
            <label>Label</label>
            <input className="input" value={form.label || ''} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="Semester 1" />
          </div>
        </>
      )}
      {step === 'course' && (
        <div className="field">
          <label>Content</label>
          <textarea className="input" rows={4} value={form.content || ''} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Course content..." />
        </div>
      )}
      <div className="row" style={{ gap: 8, marginTop: 14 }}>
        <button className="btn" type="submit">Create</button>
        <button className="btn ghost" type="button" onClick={() => { setShowForm(false); setForm({}); }}>Cancel</button>
      </div>
    </form>
  );

  return (
    <Layout>
      <FadeIn>
        <div className="page-header">
          <div className="crumb">Catalog</div>
          <h1>Browse</h1>
          <p className="sub">Explore faculties, departments, and courses.</p>
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

      {loading ? (
        <div className="grid auto">
          {[0, 1, 2, 3].map(i => <div key={i} className="skel-card" />)}
        </div>
      ) : (
        <>
          {step === 'faculty' && (
            <FadeIn delay={120}>
              <div className="row between" style={{ marginBottom: 18 }}>
                <h2 style={{ marginBottom: 0 }}>Choose a Faculty</h2>
                {isAdmin && <button className="btn" onClick={() => setShowForm(s => !s)}>+ Add Faculty</button>}
              </div>
              {showForm && renderForm()}
              <div className="hierarchy-grid">
                {items.map(f => (
                  <GradientCard
                    key={f.id}
                    icon={f.icon}
                    title={f.name}
                    subtitle="Click to explore"
                    gradient={f.color}
                    onClick={() => select('faculty', f)}
                    active={selections.faculty?.id === f.id}
                  />
                ))}
              </div>
            </FadeIn>
          )}

          {step === 'department' && (
            <FadeIn delay={120}>
              <div className="row between" style={{ marginBottom: 18 }}>
                <h2 style={{ marginBottom: 0 }}>Choose a Department</h2>
                {isAdmin && <button className="btn" onClick={() => setShowForm(s => !s)}>+ Add Department</button>}
              </div>
              {showForm && renderForm()}
              <div className="hierarchy-grid">
                {items.map(d => (
                  <GradientCard
                    key={d.id}
                    icon={d.icon}
                    title={d.name}
                    subtitle={`${selections.faculty?.name}`}
                    gradient="var(--gradient-2)"
                    onClick={() => select('department', d)}
                    active={selections.department?.id === d.id}
                  />
                ))}
              </div>
            </FadeIn>
          )}

          {step === 'program' && (
            <FadeIn delay={120}>
              <div className="row between" style={{ marginBottom: 18 }}>
                <h2 style={{ marginBottom: 0 }}>Choose a Program</h2>
                {isAdmin && <button className="btn" onClick={() => setShowForm(s => !s)}>+ Add Program</button>}
              </div>
              {showForm && renderForm()}
              <div className="hierarchy-grid">
                {items.map(l => (
                  <GradientCard
                    key={l.id}
                    icon={l.icon}
                    title={l.name}
                    subtitle={l.code}
                    gradient="var(--gradient-3)"
                    onClick={() => select('program', l)}
                    active={selections.program?.id === l.id}
                  />
                ))}
              </div>
            </FadeIn>
          )}

          {step === 'level' && (
            <FadeIn delay={120}>
              <div className="row between" style={{ marginBottom: 18 }}>
                <h2 style={{ marginBottom: 0 }}>Choose a Level</h2>
                {isAdmin && <button className="btn" onClick={() => setShowForm(s => !s)}>+ Add Level</button>}
              </div>
              {showForm && renderForm()}
              <div className="hierarchy-grid">
                {items.map(y => (
                  <GradientCard
                    key={y.id}
                    icon="📅"
                    title={y.name}
                    subtitle={y.code}
                    gradient="var(--gradient-4)"
                    onClick={() => select('level', y)}
                    active={selections.level?.id === y.id}
                  />
                ))}
              </div>
            </FadeIn>
          )}

          {step === 'semester' && (
            <FadeIn delay={120}>
              <div className="row between" style={{ marginBottom: 18 }}>
                <h2 style={{ marginBottom: 0 }}>Choose a Semester</h2>
                {isAdmin && <button className="btn" onClick={() => setShowForm(s => !s)}>+ Add Semester</button>}
              </div>
              {showForm && renderForm()}
              <div className="hierarchy-grid">
                {items.map(s => (
                  <GradientCard
                    key={s.id}
                    icon="📆"
                    title={s.name}
                    subtitle={s.code}
                    gradient="var(--gradient-5)"
                    onClick={() => select('semester', s)}
                    active={selections.semester?.id === s.id}
                  />
                ))}
              </div>
            </FadeIn>
          )}

          {step === 'subject' && (
            <FadeIn delay={120}>
              <div className="row between" style={{ marginBottom: 18 }}>
                <h2 style={{ marginBottom: 0 }}>Choose a Subject</h2>
                {isAdmin && <button className="btn" onClick={() => setShowForm(s => !s)}>+ Add Subject</button>}
              </div>
              {showForm && renderForm()}
              <div className="grid auto">
                {items.map(m => (
                  <div
                    key={m.id}
                    className="card hover click module-card"
                    onClick={() => select('subject', m)}
                  >
                    <div className="row between">
                      <span className="pill gradient">{m.course_count || 0} courses</span>
                      {selections.subject?.id === m.id && <span className="pill gradient-4">Selected</span>}
                    </div>
                    <div className="title" style={{ marginTop: 14 }}>{m.name}</div>
                    <div className="meta">{m.owner_name || 'Unassigned'}</div>
                  </div>
                ))}
              </div>
            </FadeIn>
          )}

          {step === 'course' && (
            <FadeIn delay={120}>
              <div className="row between" style={{ marginBottom: 18 }}>
                <h2 style={{ marginBottom: 0 }}>Courses in {selections.module?.name}</h2>
                {isAdmin && <button className="btn" onClick={() => setShowForm(s => !s)}>+ Add Course</button>}
              </div>
              {showForm && renderForm()}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {items.length === 0 ? (
                  <div className="empty">
                    <span className="empty-icon">📚</span>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>No courses yet</div>
                  </div>
                ) : items.map(c => (
                  <Link key={c.id} href={`/module?id=${selections.module?.id}&course=${c.id}`} className="course-box" style={{ textDecoration: 'none', color: 'inherit' }}>
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
                          <span key={a.id} className="attachment-chip">
                            {a.file_type === 'pdf' ? '📄' : a.file_type === 'docx' ? '📝' : '📊'} {a.file_name}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="row" style={{ marginTop: 4 }}>
                      <span className="pill">{c.attachment_count || 0} files</span>
                      <Link href={`/chat?courseId=${c.id}&courseTitle=${encodeURIComponent(c.title)}&mode=summarize`} className="btn sm" onClick={e => e.stopPropagation()}>
                        🤖 Summarize
                      </Link>
                    </div>
                  </Link>
                ))}
              </div>
            </FadeIn>
          )}
        </>
      )}
    </Layout>
  );
}
