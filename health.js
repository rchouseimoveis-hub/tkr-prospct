import { getSupabase, getActor, methodNotAllowed } from './_db.js';
export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    const user = await getActor(req); if (!user || user.role !== 1) return res.status(403).json({ error: 'Acesso negado.' });
    const db = getSupabase();
    const [l,v,u] = await Promise.all([
      db.from('tkr_leads').select('id',{count:'exact',head:true}),
      db.from('tkr_visits').select('id',{count:'exact',head:true}),
      db.from('tkr_users').select('id',{count:'exact',head:true})
    ]);
    const firstError = l.error || v.error || u.error;
    return res.status(firstError ? 503 : 200).json({ banco:{ok:!firstError,erro:firstError?.message||''}, leads:l.count||0, visitas:v.count||0, usuarios:u.count||0, versao:'2.3.1', config:{SUPABASE_URL:!!process.env.SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY:!!process.env.SUPABASE_SERVICE_ROLE_KEY,TKR_SECRET:!!process.env.TKR_SECRET,TKR_BOOTSTRAP_KEY:!!process.env.TKR_BOOTSTRAP_KEY} });
  } catch (error) { return res.status(503).json({ error:error.message||'Banco indisponível.' }); }
}
