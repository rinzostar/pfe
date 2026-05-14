import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import { supabase, HAS_SUPABASE } from '../lib/supabase';

const STORAGE_KEY = 'lumen_dismissed_lives';

function readDismissed() {
  if (typeof window === 'undefined') return new Set();
  try { return new Set(JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]')); }
  catch { return new Set(); }
}
function writeDismissed(set) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
}

async function decorate(live) {
  if (!HAS_SUPABASE) return live;
  // Fetch module name + host name if missing
  const needsModule = !live.modules?.name && !live.module_name && live.module_id;
  const needsHost = !live.profiles?.full_name && !live.host_name && live.host_id;
  const [mod, prof] = await Promise.all([
    needsModule ? supabase.from('modules').select('name').eq('id', live.module_id).maybeSingle() : Promise.resolve({ data: null }),
    needsHost ? supabase.from('profiles').select('full_name').eq('id', live.host_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return {
    ...live,
    module_name: live.module_name || live.modules?.name || mod.data?.name || 'Live session',
    host_name: live.host_name || live.profiles?.full_name || prof.data?.full_name || 'Professor',
  };
}

function isRealModuleLive(live) {
  return live?.status === 'live' && live.room_name === `module-${live.module_id}`;
}

export default function LiveNotifications() {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [dismissed, setDismissed] = useState(() => readDismissed());

  // Don't show on the live page itself
  const onLivePage = router.pathname === '/live';

  useEffect(() => {
    if (!user || !HAS_SUPABASE) return;

    const ch = supabase
      .channel('live-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'livestreams' }, async (payload) => {
        const live = payload.new;
        if (!isRealModuleLive(live)) return;
        if (live.host_id === user.id) return; // don't notify yourself
        const d = await decorate(live);
        setItems(prev => prev.some(x => x.id === d.id) ? prev : [...prev, d]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'livestreams' }, (payload) => {
        const live = payload.new;
        if (!live) return;
        if (live.status !== 'live') {
          // ended — remove from list
          setItems(prev => prev.filter(x => x.id !== live.id));
        }
      })
      .subscribe();

    return () => supabase.removeChannel(ch);
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
  const visible = items.filter(l => !dismissed.has(l.id));
  if (visible.length === 0) return null;

  return (
    <div className="live-notif-wrap">
      {visible.map(l => (
        <div key={l.id} className="live-notif" role="status">
          <span className="pill live">Live now</span>
          <div className="live-notif-body">
            <div className="live-notif-title">{l.module_name}</div>
            <div className="live-notif-sub">{l.host_name} is broadcasting</div>
          </div>
          <Link
            href={`/live?module=${l.module_id}`}
            className="btn live sm"
            onClick={() => dismiss(l.id)}
          >
            Join
          </Link>
          <button
            className="live-notif-close"
            onClick={() => dismiss(l.id)}
            title="Dismiss"
            aria-label="Dismiss"
          >×</button>
        </div>
      ))}
    </div>
  );
}
