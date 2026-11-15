import { supabase, verifyToken, hashPassword } from './_db.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado' });

  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  const body = req.body || {};

  if (body.self) {
    const { data: dbUser } = await supabase.from('tkr_users').select('*').eq('id', user.id).single();
    const valid = dbUser.password_hash === body.old || dbUser.password_hash === hashPassword(body.old);
    if (!valid) return res.status(400).json({ error: 'Senha atual incorreta.' });
    if (!body.new || body.new.length < 8) return res.status(400).json({ error: 'Mínimo 8 caracteres.' });

    await supabase.from('tkr_users').update({ password_hash: hashPassword(body.new) }).eq('id', user.id);
    return res.status(200).json({ ok: true });
  }

  if (user.role !== 1) return res.status(403).json({ error: 'Apenas Master pode editar usuários.' });

  const id = body.id || 'u-' + crypto.randomBytes(4).toString('hex');
  const updateData = {
    id,
    name: body.name,
    email: String(body.email || '').trim().toLowerCase(),
    role: body.role || 3,
    mid: body.mid || null,
    active: body.active !== false
  };

  if (body.password) {
    updateData.password_hash = hashPassword(body.password);
  }

  const { error } = await supabase.from('tkr_users').upsert(updateData);
  if (error) return res.status(400).json({ error: error.message });

  const { data: users } = await supabase.from('tkr_users').select('id, name, email, role, mid, active');
  return res.status(200).json({ users });
}
