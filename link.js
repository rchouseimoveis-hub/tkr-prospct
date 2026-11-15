import { supabase, verifyToken } from './_db.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  const user = verifyToken(req);
  if (!user || user.role !== 1) return res.status(403).json({ error: 'Acesso negado' });

  const { id, rotate } = req.body || {};
  const { data: target } = await supabase.from('tkr_users').select('*').eq('id', id).single();
  if (!target) return res.status(404).json({ error: 'Usuário não encontrado' });

  let code = target.access_link;
  if (!code || rotate) {
    code = crypto.randomBytes(16).toString('hex');
    await supabase.from('tkr_users').update({ access_link: code }).eq('id', id);
  }

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host;
  return res.status(200).json({ url: `${proto}://${host}/?k=${code}` });
}
