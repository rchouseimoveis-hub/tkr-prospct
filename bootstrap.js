import crypto from 'node:crypto';
import { getSupabase, hashPassword, signToken, methodNotAllowed, publicUser } from './_db.js';
export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    const key = process.env.TKR_BOOTSTRAP_KEY;
    if (!key || key.length < 24) return res.status(503).json({ error: 'Configure TKR_BOOTSTRAP_KEY (mínimo 24 caracteres) na Vercel.' });
    const body = req.body || {};
    const supplied = Buffer.from(String(body.key || ''));
    const expected = Buffer.from(key);
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return res.status(403).json({ error: 'Chave de implantação inválida.' });
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Informe nome e e-mail válidos.' });
    if (typeof body.password !== 'string' || body.password.length < 12) return res.status(400).json({ error: 'A senha precisa ter pelo menos 12 caracteres.' });
    const db = getSupabase();
    const { count, error: countError } = await db.from('tkr_users').select('id', { count: 'exact', head: true });
    if (countError) throw countError;
    if (count > 0) return res.status(409).json({ error: 'O usuário Master já foi inicializado. Use o login normal.' });
    const user = { id: `master-${crypto.randomUUID()}`, name, email, role: 1, active: true, password_hash: hashPassword(body.password) };
    const { error } = await db.from('tkr_users').insert(user);
    if (error) throw error;
    return res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (error) { return res.status(500).json({ error: error.message || 'Falha ao inicializar Master.' }); }
}
