import Layout from '../components/Layout';
import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { listAdminModules, createAccessRequest, listAccessRequests } from '../lib/db';
import { toast } from '../lib/toast';
import Link from 'next/link';
import FadeIn from '../components/FadeIn';
import AnimatedCounter from '../components/AnimatedCounter';

export default function Professor() {
  const { user } = useAuth();
  const [modules, setModules] = useState([]);
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: allModules } = await listAdminModules();
    setModules(allModules || []);
    
    if (user) {
      const { data: reqs } = await listAccessRequests();
      setRequests((reqs || []).filter(r => r.professor_id === user.id));
    }
    setLoading(false);
  };

  const requestAccess = async (module) => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }
    setRequesting(module.id);
    try {
      const { error } = await createAccessRequest({
        professor_id: user.id,
        professor_name: user.name,
        module_id: module.id,
        module_name: module.name,
      });
      if (error) throw error;
      toast.success(`🔑 Demande envoyée pour ${module.name}`);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Échec de la demande');
    }
    setRequesting(null);
  };

  const filteredModules = modules.filter(m => 
    m.name?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatus = (moduleId) => {
    const req = requests.find(r => r.module_id === moduleId);
    return req ? req.status : null;
  };

  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <Layout>
      <FadeIn>
        <div className="page-header">
          <div className="crumb">Espace Professeur</div>
          <h1>👨‍🏫 Professeur</h1>
          <p className="sub">Gérez vos modules et demandez l'accès aux cours qui vous intéressent.</p>
        </div>
      </FadeIn>

      {/* Stats */}
      <FadeIn delay={100}>
        <div className="grid cols-3" style={{ marginBottom: 32 }}>
          <div className="stat-card">
            <div className="label">✅ Modules assignés</div>
            <div className="value"><AnimatedCounter value={approvedCount} /></div>
          </div>
          <div className="stat-card">
            <div className="label">⏳ En attente</div>
            <div className="value"><AnimatedCounter value={pendingCount} /></div>
          </div>
          <div className="stat-card">
            <div className="label">📨 Total demandes</div>
            <div className="value"><AnimatedCounter value={requests.length} /></div>
          </div>
        </div>
      </FadeIn>

      {/* Search */}
      <FadeIn delay={150}>
        <div className="card" style={{ marginBottom: 28 }}>
          <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 16 }}>
            <span>🔍</span> Rechercher un module
          </h3>
          <input
            className="input"
            placeholder="Tapez le nom du module..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 500 }}
          />
        </div>
      </FadeIn>

      {/* My Requests */}
      {requests.length > 0 && (
        <FadeIn delay={200}>
          <div style={{ marginBottom: 32 }}>
            <div className="row" style={{ marginBottom: 18, gap: 10 }}>
              <span style={{ fontSize: 24 }}>📋</span>
              <h2 style={{ fontSize: 22 }}>Mes demandes</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {requests.map(req => (
                <div key={req.id} className="card" style={{ padding: 20 }}>
                  <div className="row between">
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{req.module_name}</div>
                      <div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 500 }}>
                        Demandé le {new Date(req.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <span className={`pill ${req.status === 'approved' ? 'gradient-4' : req.status === 'pending' ? '' : 'gradient-2'}`}>
                      {req.status === 'approved' ? '✅ Approuvé' : req.status === 'pending' ? '⏳ En attente' : '❌ Refusé'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      )}

      {/* Available Modules */}
      <FadeIn delay={250}>
        <div className="row" style={{ marginBottom: 18, gap: 10 }}>
          <span style={{ fontSize: 24 }}>📦</span>
          <h2 style={{ fontSize: 22 }}>Modules disponibles</h2>
        </div>
      </FadeIn>
      
      {loading ? (
        <div className="grid auto">
          {[0, 1, 2].map(i => <div key={i} className="skel-card" />)}
        </div>
      ) : filteredModules.length === 0 ? (
        <FadeIn>
          <div className="empty">
            <span className="empty-icon">📦</span>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Aucun module trouvé</div>
          </div>
        </FadeIn>
      ) : (
        <div className="grid auto">
          {filteredModules.map((m, i) => {
            const status = getStatus(m.id);
            return (
              <FadeIn key={m.id} delay={i * 80}>
                <div className="card hover" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="row between" style={{ marginBottom: 12 }}>
                    <span className="pill gradient-3">{m.semester_label || 'Semestre'}</span>
                    <span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 500 }}>{m.course_count || 0} cours</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{m.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16, fontWeight: 500 }}>
                    {m.owner_name || 'Non assigné'}
                  </div>
                  <div className="spacer" />
                  {status === 'approved' ? (
                    <Link href={`/module?id=${m.id}`} className="btn success" style={{ width: '100%' }}>
                      ✅ Accéder au module
                    </Link>
                  ) : status === 'pending' ? (
                    <button className="btn ghost" style={{ width: '100%' }} disabled>
                      ⏳ Demande en cours...
                    </button>
                  ) : (
                    <button 
                      className="btn" 
                      style={{ width: '100%' }}
                      onClick={() => requestAccess(m)}
                      disabled={requesting === m.id}
                    >
                      {requesting === m.id ? 'Envoi...' : '🔑 Demander l\'accès'}
                    </button>
                  )}
                </div>
              </FadeIn>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
