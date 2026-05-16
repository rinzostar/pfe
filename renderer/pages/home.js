import Layout from '../components/Layout';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { listFavorites, listActiveLivestreams, getRecentActivity, getContinueLearning, listPosts } from '../lib/db';
import FadeIn from '../components/FadeIn';
import GradientCard from '../components/GradientCard';

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  return Math.floor(s / 86400) + 'd';
}



export default function Home() {
  const { user } = useAuth();
  const [favs, setFavs] = useState([]);
  const [lives, setLives] = useState([]);
  const [activity, setActivity] = useState([]);
  const [continueLearning, setContinueLearning] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [
        { data: f },
        { data: l },
        { data: a },
        { data: c },
        { data: p },
      ] = await Promise.all([
        listFavorites(user.id),
        listActiveLivestreams(),
        getRecentActivity(user.id),
        getContinueLearning(user.id),
        listPosts({}),
      ]);
      setFavs(f || []);
      setLives(l || []);
      setActivity(a || []);
      setContinueLearning(c || []);
      setRecentPosts((p || []).slice(0, 3));
      setLoading(false);
    })();
  }, [user]);

  return (
    <Layout>
      {/* HERO BANNER */}
      <FadeIn>
        <div className="hero-banner">
          <div className="row between" style={{ position: 'relative', zIndex: 1 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.9, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
              <h1 style={{ fontSize: 42, marginBottom: 8 }}>
                {greeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
              </h1>
              <p style={{ fontSize: 17, opacity: 0.92, fontWeight: 500, maxWidth: 500 }}>
                Ready to learn something new today? Explore your courses, join a live session, or chat with AI.
              </p>
            </div>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Avg. Progress</div>
              <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1 }}>{continueLearning.length > 0 ? (continueLearning.reduce((sum, c) => sum + c.progress, 0) / continueLearning.length | 0) : 0}%</div>
              <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.8 }}>in courses</div>
            </div>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="num">{continueLearning.length}</div>
              <div className="lbl">In Progress</div>
            </div>
            <div className="hero-stat">
              <div className="num">{favs.length}</div>
              <div className="lbl">Favorites</div>
            </div>
            <div className="hero-stat">
              <div className="num">{lives.length}</div>
              <div className="lbl">Live Now</div>
            </div>
            
          </div>
        </div>
      </FadeIn>

      {/* LIVE SECTION */}
      <FadeIn delay={100}>
        {lives.length > 0 ? (
          <div className="card wave-live glow-live" style={{ borderColor: '#fecaca', background: 'linear-gradient(135deg, #fff5f5 0%, #fff 100%)', marginBottom: 32, position: 'relative' }}>
            <div className="row between">
              <div>
                <span className="pill live">Live now</span>
                <h3 style={{ marginTop: 12, fontSize: 22 }}>{lives[0].module_name || 'Live session'}</h3>
                <p style={{ color: 'var(--ink-3)', marginTop: 6, fontWeight: 600 }}>{lives[0].hostName || 'Professor'}</p>
              </div>
              <Link href={`/live?module=${lives[0].moduleId}`} className="btn live" style={{ padding: '14px 32px', fontSize: 16 }}>
                Join live →
              </Link>
            </div>
          </div>
        ) : (
          <div className="card" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #fff 100%)', borderColor: '#bae6fd', marginBottom: 32 }}>
            <div className="row between">
              <div>
                <span className="pill gradient-3">No live sessions</span>
                <h3 style={{ marginTop: 12, fontSize: 22 }}>No active live right now</h3>
                <p style={{ color: 'var(--ink-3)', marginTop: 6, fontWeight: 600 }}>Browse recorded courses or check back later.</p>
              </div>
              <Link href="/browse" className="btn" style={{ padding: '14px 32px', fontSize: 16 }}>
                Browse courses →
              </Link>
            </div>
          </div>
        )}
      </FadeIn>

      {/* MAIN DASHBOARD GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 28, marginBottom: 32 }}>
        <div>
          {/* CONTINUE LEARNING */}
          <FadeIn delay={150}>
            <div className="section-header">
              <h2>📚 Continue Learning</h2>
              <Link href="/browse" className="section-link">View all →</Link>
            </div>
          </FadeIn>

          {continueLearning.length === 0 ? (
            <FadeIn delay={180}>
              <div className="empty" style={{ marginBottom: 28 }}>
                <span className="empty-icon">📖</span>
                <div style={{ fontSize: 16, fontWeight: 700 }}>No courses in progress</div>
                <div style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 600, marginTop: 6 }}>Start browsing to find your first course!</div>
              </div>
            </FadeIn>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
              {continueLearning.map((c, i) => (
                <FadeIn key={c.course_id} delay={180 + i * 60}>
                  <Link href={`/module?id=${c.moduleId}&course=${c.course_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="dash-card" style={{ display: 'flex', alignItems: 'center', gap: 18, cursor: 'pointer' }}>
                      <div style={{
                        width: 56, height: 56, borderRadius: 14,
                        background: c.yt_url ? 'var(--gradient-live)' : 'var(--gradient-1)',
                        display: 'grid', placeItems: 'center',
                        fontSize: 24, flexShrink: 0,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}>
                        {c.yt_url ? '▶' : '📄'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>{c.title}</div>
                        <div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600, marginBottom: 10 }}>{c.module}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="dash-bar" style={{ flex: 1 }}>
                            <div className="dash-bar-fill" style={{ width: `${c.progress}%`, background: c.progress > 80 ? 'var(--gradient-4)' : c.progress > 50 ? 'var(--gradient-1)' : 'var(--gradient-3)' }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', flexShrink: 0 }}>{c.progress}%</span>
                        </div>
                      </div>
                      <span className="pill gradient" style={{ flexShrink: 0 }}>Continue →</span>
                    </div>
                  </Link>
                </FadeIn>
              ))}
            </div>
          )}

          {/* QUICK ACCESS */}
          <FadeIn delay={250}>
            <div className="section-header">
              <h2>⚡ Quick Access</h2>
            </div>
          </FadeIn>
          <FadeIn delay={280}>
            <div className="hierarchy-grid" style={{ marginBottom: 32 }}>
              <GradientCard icon="🔍" title="Browse" subtitle="Explore all courses" gradient="var(--gradient-1)" onClick={() => window.location.href = '/browse'} />
              <GradientCard icon="💬" title="Community" subtitle="Join discussions" gradient="var(--gradient-2)" onClick={() => window.location.href = '/community'} />
              <GradientCard icon="🤖" title="AI Chat" subtitle="Ask & summarize" gradient="var(--gradient-3)" onClick={() => window.location.href = '/chat'} />
              <GradientCard icon="🎥" title="Live" subtitle="Join sessions" gradient="var(--gradient-live)" onClick={() => window.location.href = '/browse'} />
            </div>
          </FadeIn>

          {/* FAVORITES */}
          <FadeIn delay={320}>
            <div className="section-header">
              <h2>⭐ Favorites</h2>
              <Link href="/browse" className="section-link">Browse all →</Link>
            </div>
          </FadeIn>

          {loading ? (
            <div className="grid auto" style={{ marginBottom: 32 }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="skel-card">
                  <div className="skel" style={{ width: 100, height: 16 }} />
                  <div className="skel" style={{ width: 180, height: 22 }} />
                </div>
              ))}
            </div>
          ) : favs.length === 0 ? (
            <FadeIn delay={350}>
              <div className="empty" style={{ marginBottom: 32 }}>
                <span className="empty-icon">⭐</span>
                <div style={{ fontSize: 16, fontWeight: 700 }}>No favorites yet</div>
                <Link href="/browse" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'underline' }}>Browse modules</Link>
              </div>
            </FadeIn>
          ) : (
            <div className="grid auto" style={{ marginBottom: 32 }}>
              {favs.map((c) => (
                <Link key={c.id} href={`/module?id=${c.moduleId}`} className="card hover click module-card">
                  <div className="row between">
                    <div className="pill gradient">{c.module?.name || 'Module'}</div>
                    <span className="fav on">★</span>
                  </div>
                  <div className="title" style={{ marginTop: 14 }}>{c.title}</div>
                  <div className="meta">Added to favorites</div>
                </Link>
              ))}
            </div>
          )}

          {/* COMMUNITY PREVIEW */}
          <FadeIn delay={380}>
            <div className="section-header">
              <h2>💬 Community</h2>
              <Link href="/community" className="section-link">Go to feed →</Link>
            </div>
          </FadeIn>
          {recentPosts.length === 0 ? (
            <div className="empty" style={{ marginBottom: 32 }}>
              <span className="empty-icon">💬</span>
              <div style={{ fontSize: 16, fontWeight: 700 }}>No posts yet</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
              {recentPosts.map((p, i) => (
                <FadeIn key={p.id} delay={400 + i * 60}>
                  <Link href="/community" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="card hover" style={{ padding: 18 }}>
                      <div className="row between" style={{ marginBottom: 8 }}>
                        <div className="row" style={{ gap: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: 'var(--gradient-1)', color: 'white',
                            display: 'grid', placeItems: 'center',
                            fontSize: 14, fontWeight: 700,
                          }}>
                            {(p.author_name || 'U')[0]}
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>{p.author_name}</div>
                            <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{timeAgo(p.created_at)} ago</div>
                          </div>
                        </div>
                        <span className="pill">{p.likes || 0} 👍</span>
                      </div>
                      <div style={{ fontSize: 14, color: 'var(--ink-2)', fontWeight: 500, lineHeight: 1.5 }}>{p.content.slice(0, 120)}{p.content.length > 120 ? '...' : ''}</div>
                    </div>
                  </Link>
                </FadeIn>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR */}
        <div>
          {/* UPCOMING EVENTS */}
          <FadeIn delay={200} direction="right">
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ marginBottom: 18, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📊</span> Recent Activity
              </h3>
              {activity.length === 0 ? (
                <div style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 600 }}>No recent activity</div>
              ) : (
                <div className="activity-feed">
                  {activity.slice(0, 5).map(a => (
                    <div key={a.id} className="activity-item">
                      <div className="act-icon" style={{ background: a.color || 'var(--accent-soft)', color: 'white' }}>{a.icon}</div>
                      <div className="act-body">
                        <div className="act-title">{a.title}</div>
                        <div className="act-desc">{a.detail}</div>
                        <div className="act-time">{timeAgo(a.time)} ago</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </FadeIn>

          {/* BIG STATS */}
          <FadeIn delay={300} direction="right">
            <div className="card">
              <h3 style={{ marginBottom: 18, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🏆</span> Your Progress
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="big-stat">
                  <div className="big-num gradient-text">{continueLearning.reduce((sum, c) => sum + c.progress, 0) / (continueLearning.length || 1) | 0}%</div>
                  <div className="big-lbl">Avg. Progress</div>
                </div>
                <div className="big-stat">
                  <div className="big-num gradient-text-2">{favs.length}</div>
                  <div className="big-lbl">Favorites</div>
                </div>
                <div className="big-stat">
                  <div className="big-num gradient-text-3">{activity.length}</div>
                  <div className="big-lbl">Activities</div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </Layout>
  );
}
