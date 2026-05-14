import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import Avatar from './Avatar';

const ICONS = {
  home: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V11z',
  browse: 'M4 5h16M4 12h16M4 19h10',
  community: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM3 21v-1a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v1',
  modules: 'M3 7l9-4 9 4-9 4-9-4zm0 5l9 4 9-4M3 17l9 4 9-4',
  users: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  reports: 'M9 17l3 3 7-7M5 12V5h14v7M5 19h6',
  signout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
};

function Icon({ name }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  );
}

export default function Sidebar() {
  const router = useRouter();
  const { user, signOut, switchRole, mock } = useAuth();
  const role = user?.role || 'student';
  const is = (p) => router.pathname === p || router.pathname.startsWith(p + '/');

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <aside className="sidebar">
      <div className="titlebar-pad" />
      <div className="brand">
        <div className="dot" />
        <span>Lumen</span>
      </div>

      <div className="nav-section">Learn</div>
      <Link href="/home" className={`nav-item ${is('/home') ? 'active' : ''}`}><Icon name="home" />Home</Link>
      <Link href="/browse" className={`nav-item ${is('/browse') ? 'active' : ''}`}><Icon name="browse" />Browse</Link>
      <Link href="/community" className={`nav-item ${is('/community') ? 'active' : ''}`}><Icon name="community" />Community</Link>

      {role === 'professor' && (
        <>
          <div className="nav-section">Teach</div>
          <Link href="/modules" className={`nav-item ${is('/modules') ? 'active' : ''}`}><Icon name="modules" />My modules</Link>
        </>
      )}

      {role === 'admin' && (
        <>
          <div className="nav-section">Admin</div>
          <Link href="/admin/users" className={`nav-item ${is('/admin/users') ? 'active' : ''}`}><Icon name="users" />Users</Link>
          <Link href="/admin/modules" className={`nav-item ${is('/admin/modules') ? 'active' : ''}`}><Icon name="modules" />Modules</Link>
          <Link href="/admin/reports" className={`nav-item ${is('/admin/reports') ? 'active' : ''}`}><Icon name="reports" />Reports</Link>
        </>
      )}

      <div style={{ flex: 1 }} />

      {mock && (
        <div style={{ padding: '0 6px 12px' }}>
          <div className="nav-section" style={{ paddingLeft: 4 }}>Demo · switch role</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['student', 'professor', 'admin'].map(r => (
              <button
                key={r}
                onClick={() => switchRole(r)}
                className="btn ghost sm"
                style={{
                  flex: 1, justifyContent: 'center', padding: '4px 6px', fontSize: 11,
                  background: role === r ? 'var(--ink)' : 'transparent',
                  color: role === r ? 'white' : 'var(--ink-2)',
                  borderColor: role === r ? 'var(--ink)' : 'var(--line-2)',
                }}
              >{r[0].toUpperCase() + r.slice(1)}</button>
            ))}
          </div>
        </div>
      )}

      <div className="user-card">
        <Avatar name={user?.name || 'You'} id={user?.id} size={32} />
        <div className="user-meta" style={{ flex: 1, minWidth: 0 }}>
          <div className="name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.name || 'Guest'}
          </div>
          <div className="role">{role}</div>
        </div>
        <button onClick={handleSignOut} className="icon-btn" title="Sign out">
          <Icon name="signout" />
        </button>
      </div>
    </aside>
  );
}
