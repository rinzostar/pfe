import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase, HAS_SUPABASE } from './supabase';

const AuthCtx = createContext({ user: null, loading: true, signIn: async () => {}, signOut: async () => {} });

const MOCK_KEY = 'lumen_mock_user';

function readMock() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(MOCK_KEY) || 'null'); } catch { return null; }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const getProfile = useCallback(async (sessionUser) => {
    if (!sessionUser) return null;
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();
      
      if (prof) {
        return { 
          id: prof.id, 
          email: prof.email, 
          name: prof.full_name, 
          role: prof.role, 
          banned: prof.banned 
        };
      }
      // Fallback if profile is missing in DB but exists in Auth
      return { 
        id: sessionUser.id, 
        email: sessionUser.email, 
        name: sessionUser.email.split('@')[0], 
        role: 'student', 
        banned: false 
      };
    } catch (e) {
      console.error('Error fetching profile:', e);
      return { 
        id: sessionUser.id, 
        email: sessionUser.email, 
        name: sessionUser.email.split('@')[0], 
        role: 'student', 
        banned: false 
      };
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!HAS_SUPABASE) {
      setUser(readMock());
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        const u = await getProfile(session.user);
        if (mounted) setUser(u);
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (!mounted) return;
      if (!session) {
        setUser(null);
      } else {
        const u = await getProfile(session.user);
        if (mounted) setUser(u);
      }
    });

    return () => { 
      mounted = false; 
      sub.subscription.unsubscribe(); 
    };
  }, [getProfile]);

  const signIn = useCallback(async (email, password) => {
    if (!HAS_SUPABASE) {
      const role = email.startsWith('admin') ? 'admin'
        : email.startsWith('prof') ? 'professor' : 'student';
      const u = { id: 'mock-' + role, email, name: email.split('@')[0], role, banned: false };
      localStorage.setItem(MOCK_KEY, JSON.stringify(u));
      setUser(u);
      return { ok: true };
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    
    const u = await getProfile(data.user);
    if (u?.banned) {
      await supabase.auth.signOut();
      return { ok: false, error: 'This account has been banned.' };
    }
    
    setUser(u);
    return { ok: true };
  }, [getProfile]);

  const signOut = useCallback(async () => {
    if (!HAS_SUPABASE) {
      localStorage.removeItem(MOCK_KEY);
      setUser(null);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const switchRole = useCallback((role) => {
    if (HAS_SUPABASE) return;
    const u = { id: 'mock-' + role, email: role + '@demo.local', name: role, role, banned: false };
    localStorage.setItem(MOCK_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  return (
    <AuthCtx.Provider value={{ user, loading, signIn, signOut, switchRole, mock: !HAS_SUPABASE }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

// gate hook for pages
export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);
  return { user, loading };
}
