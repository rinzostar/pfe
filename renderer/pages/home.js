import Layout from '../components/Layout';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { listFavorites, listActiveLivestreams } from '../lib/db';

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const { user } = useAuth();
  const [favs, setFavs] = useState([]);
  const [lives, setLives] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: f }, { data: l }] = await Promise.all([
        listFavorites(user.id),
        listActiveLivestreams(),
      ]);
      setFavs(f || []);
      setLives(l || []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <Layout>
      <div className="page-header">
        <div className="crumb">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        <h1>{greeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</h1>
        <p className="sub">Pick up where you left off.</p>
      </div>

      {lives.length > 0 && (
        <div className="card" style={{ borderColor: '#fecaca', background: '#fff7f7', marginBottom: 24 }}>
          <div className="row between">
            <div>
              <span className="pill live">Live now</span>
              <h3 style={{ marginTop: 8 }}>{lives[0].module_name || lives[0].modules?.name || 'Live session'}</h3>
              <p style={{ color: 'var(--ink-3)', marginTop: 4 }}>{lives[0].profiles?.full_name || 'Professor'}</p>
            </div>
            <Link href={`/live?module=${lives[0].module_id}`} className="btn live">Join live</Link>
          </div>
        </div>
      )}

      <div className="row between" style={{ marginBottom: 14 }}>
        <h2>Favorites</h2>
        <Link href="/browse" className="btn ghost sm">Browse all →</Link>
      </div>

      {loading ? (
        <div className="grid auto">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="skel-card">
              <div className="skel" style={{ width: 80, height: 14 }} />
              <div className="skel" style={{ width: 160, height: 18 }} />
            </div>
          ))}
        </div>
      ) : favs.length === 0 ? (
        <div className="empty">
          No favorites yet. <Link href="/browse" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>Browse modules</Link> and star your courses.
        </div>
      ) : (
        <div className="grid auto">
          {favs.map((c) => (
            <Link key={c.id} href={`/module?id=${c.module_id}`} className="card hover click module-card">
              <div className="row between">
                <div className="pill">{c.module?.name || 'Module'}</div>
                <span className="fav on">★</span>
              </div>
              <div className="title" style={{ marginTop: 12 }}>{c.title}</div>
              <div className="meta">Added to favorites</div>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
