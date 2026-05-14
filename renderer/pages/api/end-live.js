import { adminClient } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { livestream_id, module_id } = req.body || {};
    if (!livestream_id && !module_id) return res.status(400).json({ error: 'Missing fields' });
    const sb = adminClient();
    let q = sb.from('livestreams').update({ status: 'ended' }).eq('status', 'live');
    q = livestream_id ? q.eq('id', livestream_id) : q.eq('module_id', module_id);
    const { error } = await q;
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
