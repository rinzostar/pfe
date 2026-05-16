import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import FadeIn from '../components/FadeIn';

export default function Login() {
  const router = useRouter();
  const { login, register, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => { if (user) router.replace('/home'); }, [user, router]);

  if (authLoading || user) {
    return <div className="auth"><div style={{ color: 'var(--ink-3)', fontSize: 14, fontWeight: 600 }}>Loading…</div></div>;
  }

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      if (isSignUp) {
        await register(email, pwd, name, 'student');
      } else {
        await login(email, pwd);
      }
      router.push('/home');
    } catch (err) {
      setErr(err.message || 'Failed');
    }
    setLoading(false);
  };

  return (
    <div className="auth">
      <FadeIn>
        <div className="auth-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 26 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--gradient-1)', boxShadow: '0 4px 12px rgba(102,126,234,0.3)' }} />
            <span style={{ fontWeight: 800, letterSpacing: '-0.02em', fontSize: 22, background: 'var(--gradient-1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Lumen</span>
          </div>
          <h1>{isSignUp ? 'Create account' : 'Welcome back'}</h1>
          <p className="sub">Sign in with your school credentials.</p>

          <form onSubmit={submit}>
            {isSignUp && (
              <div className="field">
                <label>Full name</label>
                <input className="input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}
            <div className="field">
              <label>Email</label>
              <input className="input" type="email" placeholder="you@school.edu" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label>Password</label>
              <input className="input" type="password" placeholder="••••••••" value={pwd} onChange={(e) => setPwd(e.target.value)} required />
            </div>
            {err && (
              <div style={{ background: '#fef2f2', color: 'var(--danger)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 14, fontWeight: 700 }}>
                {err}
              </div>
            )}
            <button className="btn" type="submit" disabled={loading} style={{ width: '100%', padding: '14px 18px', fontSize: 16 }}>
              {loading ? (isSignUp ? 'Creating…' : 'Signing in…') : (isSignUp ? 'Create account' : 'Sign in')}
            </button>
          </form>

          <p className="auth-foot">
            <button type="button" onClick={() => setIsSignUp(!isSignUp)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </p>
        </div>
      </FadeIn>
    </div>
  );
}
