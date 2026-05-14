import Layout from '../components/Layout';
import { useAuth } from '../lib/auth';
import { useState } from 'react';
import { toast } from '../lib/toast';
import FadeIn from '../components/FadeIn';

export default function Profile() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    bio: 'Étudiant passionné par les sciences et la technologie.',
  });

  const handleSave = () => {
    setEditing(false);
    toast.success('✨ Profil mis à jour');
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('') || 'U';
  const roleLabel = user?.role === 'student' ? 'Étudiant' : user?.role === 'professor' ? 'Professeur' : 'Administrateur';

  return (
    <Layout>
      <FadeIn>
        <div className="page-header">
          <div className="crumb">Mon compte</div>
          <h1>👤 Profil</h1>
          <p className="sub">Gérez vos informations personnelles et préférences.</p>
        </div>
      </FadeIn>

      {/* Cover Image */}
      <FadeIn delay={100}>
        <div className="card" style={{ 
          padding: 0, 
          overflow: 'hidden', 
          marginBottom: 28,
          position: 'relative'
        }}>
          <div style={{
            height: 160,
            background: 'var(--bg-gradient)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: -50, right: -50, fontSize: 200, opacity: 0.1 }}>🎓</div>
            <div style={{ position: 'absolute', bottom: -30, left: 40, fontSize: 150, opacity: 0.08 }}>📚</div>
          </div>
          <div style={{ padding: '0 32px 32px', position: 'relative' }}>
            <div style={{
              width: 100, height: 100, borderRadius: '50%',
              background: 'var(--bg-gradient-2)',
              display: 'grid', placeItems: 'center',
              marginTop: -50,
              fontSize: 40, color: 'white', fontWeight: 800,
              boxShadow: '0 8px 32px rgba(245, 87, 108, 0.3)',
              border: '4px solid var(--surface)',
              position: 'relative',
              zIndex: 2
            }}>
              {initials}
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>{user?.name || 'Utilisateur'}</div>
              <div className="pill gradient-2" style={{ marginBottom: 8 }}>{roleLabel}</div>
              <div style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 500 }}>
                {user?.email || 'email@school.edu'}
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 28 }}>
        <div>
          <FadeIn delay={150}>
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="row between" style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span>📝</span> Informations personnelles
                </h3>
                <button className="btn ghost sm" onClick={() => setEditing(!editing)}>
                  {editing ? '✕ Annuler' : '✏️ Modifier'}
                </button>
              </div>
              
              {editing ? (
                <div>
                  <div className="field">
                    <label>Nom complet</label>
                    <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>Email</label>
                    <input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>Bio</label>
                    <textarea className="textarea" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} style={{ minHeight: 120 }} />
                  </div>
                  <div className="row" style={{ gap: 12 }}>
                    <button className="btn" onClick={handleSave}>💾 Enregistrer</button>
                    <button className="btn ghost" onClick={() => setEditing(false)}>Annuler</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 8 }}>Nom complet</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{user?.name || 'Non renseigné'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 8 }}>Email</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{user?.email || 'Non renseigné'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 8 }}>Rôle</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{roleLabel}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 8 }}>Bio</div>
                    <div style={{ fontSize: 16, color: 'var(--ink-2)', lineHeight: 1.6 }}>{form.bio}</div>
                  </div>
                </div>
              )}
            </div>
          </FadeIn>

          {/* Activity Timeline */}
          <FadeIn delay={200}>
            <div className="card">
              <h3 style={{ marginBottom: 24, fontSize: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>📅</span> Activité récente
              </h3>
              <div>
                {[
                  { icon: '📚', title: 'Cours consulté', desc: 'Mathématiques I - Vecteurs et Espaces', time: '2h ago' },
                  { icon: '💬', title: 'Commentaire ajouté', desc: 'Dans la communauté', time: '5h ago' },
                  { icon: '⭐', title: 'Ajouté aux favoris', desc: 'Introduction à la Programmation', time: '1j ago' },
                  { icon: '🎥', title: 'Live rejoint', desc: 'Session de Dr. M. Chérif', time: '2j ago' },
                ].map((item, i) => (
                  <div key={i} className="timeline-item">
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{item.icon} {item.title}</div>
                    <div style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 4 }}>{item.desc}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{item.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Right Sidebar */}
        <div>
          <FadeIn delay={200} direction="right">
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ marginBottom: 18, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📊</span> Statistiques
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="row between">
                  <span style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 500 }}>⭐ Favoris</span>
                  <span style={{ fontSize: 20, fontWeight: 800, background: 'var(--bg-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>5</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: '62%' }} />
                </div>
                <div className="row between">
                  <span style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 500 }}>💬 Posts</span>
                  <span style={{ fontSize: 20, fontWeight: 800, background: 'var(--bg-gradient-2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>3</span>
                </div>
                <div className="row between">
                  <span style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 500 }}>📚 Modules</span>
                  <span style={{ fontSize: 20, fontWeight: 800, background: 'var(--bg-gradient-3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>8</span>
                </div>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={300} direction="right">
            <div className="card">
              <h3 style={{ marginBottom: 18, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⚙️</span> Préférences
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="row between">
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>🔔 Notifications push</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Alertes pour nouveaux posts et lives</div>
                  </div>
                  <div className="pill gradient" style={{ fontSize: 11 }}>Activé</div>
                </div>
                <div className="row between">
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>🌙 Mode sombre</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Thème d'interface</div>
                  </div>
                  <div className="pill" style={{ fontSize: 11 }}>Bientôt</div>
                </div>
                <div className="row between">
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>📧 Newsletter</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Résumé hebdomadaire</div>
                  </div>
                  <div className="pill gradient-4" style={{ fontSize: 11 }}>Activé</div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </Layout>
  );
}
