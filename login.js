import { getSupabase, signToken, verifyPassword, hashPassword, methodNotAllowed, publicUser } from './_db.js';
export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    const db = getSupabase(); const { email, password, link } = req.body || {};
    if (link) {
      const { data: user, error } = await db.from('tkr_users').select('*').eq('access_link', String(link)).eq('active', true).gt('access_link_expires_at', new Date().toISOString()).maybeSingle();
      if (error) throw error;
      if (!user) return res.status(401).json({ error: 'Link inválido ou revogado.' });
      const { error: consumeError } = await db.from('tkr_users').update({ access_link: null, access_link_expires_at: null }).eq('id', user.id);
      if (consumeError) throw consumeError;
      return res.status(200).json({ token: signToken(user), user: publicUser(user) });
    }
    const cleanEmail = String(email || '').trim().toLowerCase();
    const { data: user, error } = await db.from('tkr_users').select('*').eq('email', cleanEmail).maybeSingle();
    if (error) throw error;
    if (!user || !user.active) return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    const check = verifyPassword(password, user.password_hash);
    if (!check.valid) return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    if (check.needsUpgrade) {
      const { error: upgradeError } = await db.from('tkr_users').update({ password_hash: hashPassword(password) }).eq('id', user.id);
      if (upgradeError) throw upgradeError;
    }
    return res.status(200).json({ token: signToken(user), user: publicUser(user) });
  } catch (error) { return res.status(500).json({ error: error.message || 'Falha no login.' }); }
}
