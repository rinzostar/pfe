import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import { listActiveLivestreams } from '../lib/db';

const STORAGE_KEY = 'lumen_dismissed_lives';

function readDismissed() {
  if (typeof window === 'undefined') return new Set();
  try { return new Set(JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]')); }
  catch { return new Set(); }
}
function writeDismissed(set) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
}

export default function LiveNotifications() {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [dismissed, setDismissed] = useState(() => readDismissed());

  const onLivePage = router.pathname === '/live';

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { data } = await listActiveLivestreams();
      const lives = (data || []).filter(l => l.status === 'live');
      setItems(prev => {
      const existing = new Set(prev.map(x => x._id));
      const newItems = lives.filter(l => !existing.has(l._id));
        return [...prev, ...newItems];
      });
    };
    check();
    const timer = setInterval(check, 10000);
    return () => clearInterval(timer);
  }, [user?.id]);

  const dismiss = (id) => {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(id);
      writeDismissed(next);
      return next;
    });
  };

  if (!user || onLivePage) return null;
  const visible = items.filter(l => !dismissed.has(l._id));
  if (visible.length === 0) return null;

  return (
    <div className="live-notif-wrap">
      {visible.map(l => (
        <div key={l._id} className="live-notif" role="status">
          <span className="pill live">Live now</span>
          <div className="live-notif-body">
            <div className="live-notif-title">{l.module_name}</div>
            <div className="live-notif-sub">{l.hostName || 'Professor'} is broadcasting</div>
          </div>
          <Link
            href={`/live?module=${l.moduleId}`}
            className="btn live sm"
            onClick={() => dismiss(l._id)}
          >
            Join
          </Link>
          <button
            className="live-notif-close"
            onClick={() => dismiss(l._id)}
            title="Dismiss"
            aria-label="Dismiss"
          >×</button>
        </div>
      ))}
    </div>
  );
}
