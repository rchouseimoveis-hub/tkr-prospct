import { getSupabase, verifyToken, signToken, methodNotAllowed, publicUser } from './_db.js';
export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    const db = getSupabase();
    const tokenUser = verifyToken(req);
    if (!tokenUser) {
      const { count, error } = await db.from('tkr_users').select('id', { count: 'exact', head: true });
      if (error) throw error;
      return res.status(200).json({ server: true, setupRequired: count === 0 });
    }
    const { data: user, error } = await db.from('tkr_users').select('id,name,email,role,mid,active').eq('id', tokenUser.id).maybeSingle();
    if (error) throw error;
    if (!user || !user.active) return res.status(401).json({ error: 'Sessão inválida ou usuário inativo.' });
    return res.status(200).json({ server: true, user, token: signToken(user) });
  } catch (error) { return res.status(503).json({ error: error.message || 'Backend indisponível.' }); }
}
