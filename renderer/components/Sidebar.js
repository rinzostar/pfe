import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import Avatar from './Avatar';
import { useEffect, useState } from 'react';
import { getUnreadCount } from '../lib/db';

const ICONS = {
  home: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V11z',
  browse: 'M4 5h16M4 12h16M4 19h10',
  community: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM3 21v-1a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v1',
  modules: 'M3 7l9-4 9 4-9 4-9-4zm0 5l9 4 9-4M3 17l9 4 9-4',
  users: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  reports: 'M9 17l3 3 7-7M5 12V5h14v7M5 19h6',
  signout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  profile: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
};

function Icon({ name }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  );
}

export default function Sidebar() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { dark, toggle } = useTheme();
  const role = user?.role || 'student';
  const is = (p) => router.pathname === p || router.pathname.startsWith(p + '/');
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    getUnreadCount(user.userId).then(({ data }) => setUnread(data || 0));
    const iv = setInterval(() => {
    getUnreadCount(user.userId).then(({ data }) => setUnread(data || 0));
    }, 5000);
    return () => clearInterval(iv);
  }, [user]);

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
      <Link href="/home" className={`nav-item ${is('/home') ? 'active' : ''}`}><Icon name="home" /><span>Home</span></Link>
      <Link href="/browse" className={`nav-item ${is('/browse') ? 'active' : ''}`}><Icon name="browse" /><span>Browse</span></Link>
      <Link href="/community" className={`nav-item ${is('/community') ? 'active' : ''}`}><Icon name="community" /><span>Community</span></Link>
      <Link href="/notifications" className={`nav-item ${is('/notifications') ? 'active' : ''}`}>
        <Icon name="bell" />
        <span>Notifications</span>
        {unread > 0 && (
          <span style={{
            marginLeft: 'auto',
            background: 'var(--gradient-live)',
            color: 'white',
            fontSize: 11,
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: 999,
            boxShadow: '0 2px 8px rgba(239,68,68,0.3)',
          }}>{unread}</span>
        )}
      </Link>
      <Link href="/profile" className={`nav-item ${is('/profile') ? 'active' : ''}`}><Icon name="profile" /><span>Profile</span></Link>

      {role === 'professor' && (
        <>
          <div className="nav-section">Teach</div>
          <Link href="/modules" className={`nav-item ${is('/modules') ? 'active' : ''}`}><Icon name="modules" /><span>My modules</span></Link>
          <Link href="/professor" className={`nav-item ${is('/professor') ? 'active' : ''}`}><Icon name="users" /><span>Professor</span></Link>
        </>
      )}

      {role === 'admin' && (
        <>
          <div className="nav-section">Admin</div>
          <Link href="/admin/users" className={`nav-item ${is('/admin/users') ? 'active' : ''}`}><Icon name="users" /><span>Users</span></Link>
          <Link href="/admin/structure" className={`nav-item ${is('/admin/structure') ? 'active' : ''}`}><Icon name="browse" /><span>Structure</span></Link>
          <Link href="/admin/modules" className={`nav-item ${is('/admin/modules') ? 'active' : ''}`}><Icon name="modules" /><span>Modules</span></Link>
          <Link href="/admin/reports" className={`nav-item ${is('/admin/reports') ? 'active' : ''}`}><Icon name="reports" /><span>Reports</span></Link>
        </>
      )}

      <div style={{ flex: 1 }} />

      <button
        onClick={toggle}
        className="nav-item"
        style={{ padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left', borderRadius: 'var(--radius-sm)' }}
        title="Toggle dark mode"
      >
        <span style={{ marginRight: 10 }}>{dark ? '☀️' : '🌙'}</span>
        <span style={{ fontSize: 13 }}>{dark ? 'Light Mode' : 'Dark Mode'}</span>
      </button>

      

      <div className="user-card">
        <Avatar name={user?.name || 'You'} id={user?.id} size={40} />
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
