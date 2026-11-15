import { supabase, verifyToken, signToken } from './_db.js';

export default async function handler(req, res) {
  const tokenUser = verifyToken(req);
  if (!tokenUser) {
    return res.status(200).json({ server: true });
  }

  const { data: user } = await supabase
    .from('tkr_users')
    .select('id, name, email, role, mid, active')
    .eq('id', tokenUser.id)
    .single();

  if (!user || !user.active) {
    return res.status(401).json({ error: 'Sessão inválida ou usuário inativo' });
  }

  return res.status(200).json({
    server: true,
    user,
    token: signToken(user)
  });
}
