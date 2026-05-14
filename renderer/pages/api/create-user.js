import { adminClient } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { email, full_name, role, dob } = req.body || {};
    if (!email || !full_name || !role || !dob) return res.status(400).json({ error: 'Missing fields' });

    const suffix = role === 'professor' ? 'prof' : (role === 'admin' ? 'admin' : 'std');
    const password = `${dob}_${suffix}`;

    const sb = adminClient();
    const { data: created, error: cErr } = await sb.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (cErr) return res.status(400).json({ error: cErr.message });

    const { error: pErr } = await sb.from('profiles').insert({
      id: created.user.id, email, full_name, role, banned: false,
    });
    if (pErr) return res.status(400).json({ error: pErr.message });

    return res.json({ ok: true, password });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
