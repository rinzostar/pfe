import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const HAS_SUPABASE = Boolean(url && anon);

export const supabase = HAS_SUPABASE
  ? createClient(url, anon, { auth: { persistSession: true } })
  : null;

// server-only client (do NOT import from client components)
export function adminClient() {
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) throw new Error('Missing Supabase env vars');
  return createClient(url, service, { auth: { persistSession: false } });
}
