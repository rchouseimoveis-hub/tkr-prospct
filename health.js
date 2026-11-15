import { supabase, verifyToken } from './_db.js';

export default async function handler(req, res) {
  const user = verifyToken(req);
  if (!user || user.role !== 1) return res.status(403).json({ error: 'Acesso negado' });

  const [l, v, u] = await Promise.all([
    supabase.from('tkr_leads').select('id', { count: 'exact', head: true }),
    supabase.from('tkr_visits').select('id', { count: 'exact', head: true }),
    supabase.from('tkr_users').select('id', { count: 'exact', head: true })
  ]);

  return res.status(200).json({
    banco: { ok: !l.error, erro: l.error?.message || '' },
    leads: l.count || 0,
    visitas: v.count || 0,
    usuarios: u.count || 0,
    versao: '2.0.0-cloud',
    config: {
      SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      WHATSAPP_API_URL: Boolean(process.env.WHATSAPP_API_URL),
      RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY)
    }
  });
}
