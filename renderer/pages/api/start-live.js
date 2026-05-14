import { adminClient } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { module_id, host_id } = req.body || {};
    if (!module_id || !host_id) return res.status(400).json({ error: 'Missing fields' });

    const sb = adminClient();
    const room_name = `module-${module_id}`;
    const { data: active, error: activeError } = await sb.from('livestreams')
      .select('*')
      .eq('module_id', module_id)
      .eq('room_name', room_name)
      .eq('status', 'live')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (activeError) return res.status(400).json({ error: activeError.message });
    if (active) return res.json({ ok: true, livestream: active });

    const { data, error } = await sb.from('livestreams')
      .insert({ module_id, host_id, room_name, status: 'live' })
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });

    return res.json({ ok: true, livestream: data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
