import { supabase, verifyToken } from './_db.js';

export default async function handler(req, res) {
  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado' });

  if (req.method === 'GET') {
    const clientVer = Number(req.query.v || 0);
    const { data: meta } = await supabase.from('tkr_meta').select('ver').eq('key', 'sync').single();
    const currentVer = meta?.ver || 1;

    if (clientVer && clientVer === currentVer) {
      return res.status(200).json({ same: true, ver: currentVer });
    }

    const [leadsRes, visitsRes, usersRes] = await Promise.all([
      supabase.from('tkr_leads').select('payload'),
      supabase.from('tkr_visits').select('payload'),
      supabase.from('tkr_users').select('id, name, email, role, mid, active')
    ]);

    return res.status(200).json({
      ver: currentVer,
      leads: (leadsRes.data || []).map(r => r.payload),
      visits: (visitsRes.data || []).map(r => r.payload),
      users: usersRes.data || []
    });
  }

  if (req.method === 'POST') {
    const { leads, visits } = req.body || {};

    if (leads?.up?.length) {
      const rows = leads.up.map(l => ({
        id: l.id,
        cs: l.cs || '',
        payload: l,
        updated_at: new Date().toISOString()
      }));
      await supabase.from('tkr_leads').upsert(rows);
    }

    if (leads?.del?.length && user.role !== 3) {
      await supabase.from('tkr_leads').delete().in('id', leads.del);
    }

    if (visits?.up?.length) {
      const vRows = visits.up.map(v => ({
        id: v.id,
        cs: v.cs || '',
        payload: v,
        updated_at: new Date().toISOString()
      }));
      await supabase.from('tkr_visits').upsert(vRows);
    }

    if (visits?.del?.length && user.role !== 3) {
      await supabase.from('tkr_visits').delete().in('id', visits.del);
    }

    const { data: meta } = await supabase.from('tkr_meta').select('ver').eq('key', 'sync').single();
    const nextVer = (meta?.ver || 1) + 1;
    await supabase.from('tkr_meta').upsert({ key: 'sync', ver: nextVer });

    return res.status(200).json({ ok: true, ver: nextVer });
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
