import crypto from 'node:crypto';
import { getSupabase, getActor, hashPassword, verifyPassword, methodNotAllowed, publicUser } from './_db.js';
export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    const actor = await getActor(req); if (!actor) return res.status(401).json({ error: 'Não autorizado.' });
    const db = getSupabase(); const body = req.body || {};
    if (body.self === true) {
      const { data: current, error } = await db.from('tkr_users').select('id,password_hash,active').eq('id', actor.id).maybeSingle();
      if (error) throw error;
      if (!current || !current.active) return res.status(401).json({ error: 'Usuário inativo.' });
      const check = verifyPassword(body.old, current.password_hash);
      if (!check.valid) return res.status(400).json({ error: 'Senha atual incorreta.' });
      const next = String(body.new || ''); if (next.length < 12) return res.status(400).json({ error: 'A nova senha precisa ter pelo menos 12 caracteres.' });
      const { error: updateError } = await db.from('tkr_users').update({ password_hash: hashPassword(next) }).eq('id', actor.id);
      if (updateError) throw updateError;
      return res.status(200).json({ ok: true });
    }
    if (actor.role !== 1) return res.status(403).json({ error: 'Apenas Master pode gerenciar usuários.' });
    const id = body.id || `u-${crypto.randomUUID()}`;
    const { data: existing, error: readError } = await db.from('tkr_users').select('id,role').eq('id', id).maybeSingle();
    if (readError) throw readError;
    const role = Number(body.role);
    if (![1,2,3].includes(role)) return res.status(400).json({ error: 'Perfil inválido.' });
    if (existing?.role === 1 && (body.active === false || role !== 1)) return res.status(400).json({ error: 'Não é permitido desativar ou rebaixar o Master por esta tela.' });
    const update = { id, name: String(body.name || '').trim(), email: String(body.email || '').trim().toLowerCase(), role, mid: body.mid || null, active: body.active !== false };
    if (!update.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(update.email)) return res.status(400).json({ error: 'Nome e e-mail válidos são obrigatórios.' });
    if (body.password) { if (String(body.password).length < 12) return res.status(400).json({ error: 'Senha precisa ter pelo menos 12 caracteres.' }); update.password_hash = hashPassword(body.password); }
    if (!existing && !body.password) return res.status(400).json({ error: 'Defina uma senha inicial com pelo menos 12 caracteres.' });
    const { error } = await db.from('tkr_users').upsert(update); if (error) throw error;
    const { data: users, error: listError } = await db.from('tkr_users').select('id,name,email,role,mid,active').order('role', { ascending: true });
    if (listError) throw listError;
    return res.status(200).json({ users: users.map(publicUser) });
  } catch (error) { return res.status(400).json({ error: error.message || 'Falha ao salvar usuário.' }); }
}
