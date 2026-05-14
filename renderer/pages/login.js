import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';

export default function Login() {
  const router = useRouter();
  const { signIn, user, loading: authLoading, mock } = useAuth();
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { if (user) router.replace('/home'); }, [user, router]);

  if (authLoading || user) {
    return <div className="auth"><div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div></div>;
  }

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    const res = await signIn(email, pwd);
    setLoading(false);
    if (res.ok) router.push('/home');
    else setErr(res.error || 'Sign in failed');
  };

  return (
    <div className="auth">
      <div className="auth-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
          <div style={{ width: 24, height: 24, borderRadius: 7, background: '#0a0a0a' }} />
          <span style={{ fontWeight: 600, letterSpacing: '-0.02em' }}>Lumen</span>
        </div>
        <h1>Welcome back</h1>
        <p className="sub">Sign in with your school credentials.</p>

        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input className="input" type="email" placeholder="you@school.edu" autoFocus
              value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input className="input" type="password" placeholder="••••••••"
              value={pwd} onChange={(e) => setPwd(e.target.value)} required />
          </div>
          {err && (
            <div style={{ background: '#fef2f2', color: 'var(--danger)', padding: '8px 12px', borderRadius: 6, fontSize: 12, marginBottom: 12 }}>
              {err}
            </div>
          )}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {mock ? (
          <p className="auth-foot">
            Demo mode — no Supabase env. Try <span className="kbd">student@demo</span>, <span className="kbd">prof@demo</span>, or <span className="kbd">admin@demo</span> with any password.
          </p>
        ) : (
          <p className="auth-foot">
            First time? Use <span className="kbd">dd/mm/yyyy_std</span> as your password. 
            <br />Login with <span className="kbd">admin@lumen.test</span> / <span className="kbd">password123</span>
          </p>
        )}
      </div>
    </div>
  );
}
